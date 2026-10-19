/**
 * Model providers behind one tiny interface, so the platform can move to a
 * better or cheaper model with an environment change — no code change.
 *
 *   AI_PROVIDER=none               (default) → rule-based summaries only, zero cost
 *   AI_PROVIDER=anthropic          → Claude Messages API (AI_API_KEY, AI_MODEL)
 *   AI_PROVIDER=openai_compatible  → any OpenAI-compatible chat endpoint
 *                                    (AI_BASE_URL, AI_API_KEY, AI_MODEL) — e.g. a hosted
 *                                    open-weights model or a gateway that routes models
 *
 * SERVER ONLY. Keys are never exposed to the browser.
 */

export type GenerateRequest = { system: string; user: string; maxTokens: number; signal?: AbortSignal };
export type GenerateResult = { text: string; inputTokens: number | null; outputTokens: number | null };

export type ExtractRequest = {
  system: string;
  prompt: string;
  /** image/jpeg | image/png | image/webp | application/pdf */
  mediaType: string;
  base64: string;
  maxTokens: number;
  signal?: AbortSignal;
};

export interface AiProvider {
  id: "anthropic" | "openai_compatible";
  model: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
  /** Reads a document image / PDF. Optional: not every provider or model can see images. */
  extract?(req: ExtractRequest): Promise<GenerateResult>;
  /** Media types `extract` accepts. */
  extractTypes?: readonly string[];
}

type Env = Record<string, string | undefined>;

/** Default model for Anthropic: the small, low-cost tier. Override with AI_MODEL. */
export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";

export function getProvider(env: Env = process.env): AiProvider | null {
  const kind = (env.AI_PROVIDER ?? "none").trim();
  const key = env.AI_API_KEY?.trim();
  if (kind === "anthropic" && key) {
    return anthropicProvider(key, env.AI_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL);
  }
  if (kind === "openai_compatible" && key && env.AI_BASE_URL && env.AI_MODEL) {
    let base: URL;
    try {
      base = new URL(env.AI_BASE_URL);
    } catch {
      return null;
    }
    if (base.protocol !== "https:") return null;
    return openAiCompatibleProvider(base.toString().replace(/\/+$/, ""), key, env.AI_MODEL.trim());
  }
  return null;
}

function anthropicProvider(apiKey: string, model: string): AiProvider {
  return {
    id: "anthropic",
    model,
    async generate({ system, user, maxTokens, signal }) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.2, system, messages: [{ role: "user", content: user }] }),
        signal,
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}`);
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
      return { text, inputTokens: data.usage?.input_tokens ?? null, outputTokens: data.usage?.output_tokens ?? null };
    },
    extractTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    async extract({ system, prompt, mediaType, base64, maxTokens, signal }) {
      const source = { type: "base64", media_type: mediaType, data: base64 };
      const block = mediaType === "application/pdf" ? { type: "document", source } : { type: "image", source };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: [block, { type: "text", text: prompt }] }] }),
        signal,
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}`);
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
      return { text, inputTokens: data.usage?.input_tokens ?? null, outputTokens: data.usage?.output_tokens ?? null };
    },
  };
}

function openAiCompatibleProvider(baseUrl: string, apiKey: string, model: string): AiProvider {
  return {
    id: "openai_compatible",
    model,
    async generate({ system, user, maxTokens, signal }) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal,
      });
      if (!res.ok) throw new Error(`openai_compatible ${res.status}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        text: data.choices?.[0]?.message?.content ?? "",
        inputTokens: data.usage?.prompt_tokens ?? null,
        outputTokens: data.usage?.completion_tokens ?? null,
      };
    },
    // Images only (OpenAI-style vision content parts); the configured model must support vision.
    extractTypes: ["image/jpeg", "image/png", "image/webp"],
    async extract({ system, prompt, mediaType, base64, maxTokens, signal }) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0,
          messages: [
            { role: "system", content: system },
            { role: "user", content: [{ type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } }, { type: "text", text: prompt }] },
          ],
        }),
        signal,
      });
      if (!res.ok) throw new Error(`openai_compatible ${res.status}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return { text: data.choices?.[0]?.message?.content ?? "", inputTokens: data.usage?.prompt_tokens ?? null, outputTokens: data.usage?.completion_tokens ?? null };
    },
  };
}
