import { NextResponse } from "next/server";
import pkg from "../../../package.json";
import { absoluteUrl, siteConfig } from "@/config/site";
import { TOOLS } from "@/lib/assistant/tools";

export const dynamic = "force-static";

/** OpenAPI 3.1 description of the assistant tools, for custom GPT Actions. */
export function GET() {
  const paths: Record<string, unknown> = {};
  for (const t of TOOLS) {
    paths[`/api/v1/tools/${t.name}`] = {
      post: {
        operationId: t.name,
        summary: t.title,
        description: t.description.slice(0, 300),
        "x-openai-isConsequential": false,
        requestBody: { required: true, content: { "application/json": { schema: t.inputSchema } } },
        responses: {
          "200": {
            description: "The result as readable text (answer) plus structured data.",
            content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, answer: { type: "string" }, data: { type: "object" } } } } },
          },
          "422": { description: "The input needs fixing; error explains what.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } } },
        },
      },
    };
  }
  return NextResponse.json(
    {
      openapi: "3.1.0",
      info: {
        title: "Heramb.study class test analyser",
        version: pkg.version,
        description: "Turns class test marks into chapter-wise teaching plans. Read-only calculations; nothing is stored.",
        contact: { url: absoluteUrl("/contact") },
      },
      servers: [{ url: siteConfig.url }],
      paths,
    },
    { headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
