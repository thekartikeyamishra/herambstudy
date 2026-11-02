# Heramb in ChatGPT, Grok and Claude

Heramb exposes its analyser to AI assistants in two forms. Both are read-only calculations on the marks the user pastes; nothing is stored.

| Form | Address | Used by |
|---|---|---|
| **MCP server** (Streamable HTTP, stateless, no auth) | `https://herambstudy.com/api/mcp` | ChatGPT apps (Apps SDK / app directory), Grok custom connectors, Claude custom connectors |
| **REST + OpenAPI** | `https://herambstudy.com/openapi.json` → `POST /api/v1/tools/{tool}` | Custom GPTs (Actions) in the GPT Store |

**Tools:**
- `analyse_class_test`: a marks table in; teaching plan, chapter averages, recap groups and students needing attention out.
- `convert_question_marks_to_chapters`: question-wise marks, right/wrong answers, or OMR options with an answer key, plus a paper map; returns a chapter table and the plan.
- `compare_follow_up_test`: two tests in; chapter-by-chapter improved / declined / no clear change, gaps closed, students still below 50%.

All three are marked `readOnlyHint: true`.

## 1. Check it works (after deploying)

```powershell
# Initialize (expect protocolVersion and serverInfo "heramb-study")
curl.exe -s -X POST https://herambstudy.com/api/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-06-18\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1\"}}}"
# List tools (expect 3)
curl.exe -s -X POST https://herambstudy.com/api/mcp -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}"
```

You can also test it with the official **MCP Inspector**: `npx @modelcontextprotocol/inspector`, choose transport "Streamable HTTP", URL `https://herambstudy.com/api/mcp`.

## 2. ChatGPT

ChatGPT plugins were retired in 2024. The current routes are **apps** (MCP) and **custom GPTs**.

### A. App in the ChatGPT app directory (the main route)
1. **Developer mode test:** in ChatGPT, open Settings → Apps & Connectors → Advanced → turn on Developer mode. Then create a new app or connector with the MCP URL `https://herambstudy.com/api/mcp` and no authentication. Ask: *"Analyse this test: …"* with a pasted table. (Menu names can change; look under Apps / Connectors.)
2. **Submit:** on platform.openai.com → Apps (apps-manage), submit with:
   - the MCP URL;
   - **test instructions**: paste the sample table below and ask "What should I reteach?";
   - directory metadata: name *Heramb: Class Test Analyser*; short description *Turn class test marks into a chapter-wise teaching plan*; category Education; icon `public/icons/icon-512.png`;
   - privacy policy: `https://herambstudy.com/privacy`;
   - countries: start with India.
3. **Review rules to respect:**
   - suitable for all audiences;
   - clear privacy policy (done);
   - request only needed data (only the marks table);
   - no misleading claims.

   Payments inside ChatGPT aren't open for digital goods yet, so the app links to herambstudy.com for reports and the institute dashboard.
4. You will need an OpenAI developer account and identity or organization verification for publishing. Follow what the dashboard asks.

### B. Custom GPT in the GPT Store (fast; any ChatGPT Plus user can build one)
1. ChatGPT → Explore GPTs → Create.
   - **Name:** *Heramb Class Test Analyser*.
   - **Instructions:** *"When a teacher shares test marks, call the right Heramb action and present the plan clearly. Prefer roll numbers. Reply in the teacher's language (Hindi welcome). For student report links and QR slips, point to https://herambstudy.com/resources/class-test-analyser."*
2. **Actions:** Create new action → Import from URL → `https://herambstudy.com/openapi.json`. Authentication: None. Privacy policy: `https://herambstudy.com/privacy`.
3. Test in the preview, then Publish → **Everyone** (GPT Store). You need a verified builder profile (Settings → Builder profile; verify your domain herambstudy.com with the DNS TXT record it shows).

## 3. Grok
- **What exists today:**
  - **Grok custom connectors (grok.com):** a user pastes an MCP server URL. Paid Grok tiers only.
  - **The Grok Build plugin marketplace:** for xAI's *coding* CLI. Listing is a pull request to the `xai-org/plugin-marketplace` GitHub repo. It's for developers, not teachers, so it isn't a fit for Heramb.
  - There's no public consumer "bot marketplace" with a review process at the moment. Check xAI's docs when you're ready, because this changes quickly.
- **What to do:** publish the connector URL (on `/ai-assistants`) and tell paying Grok users: *grok.com → Connectors → New connector → Custom → paste `https://herambstudy.com/api/mcp`.*

## 4. Claude
Settings → Connectors → Add custom connector → `https://herambstudy.com/api/mcp`. No sign-in is needed.

## Sample table for reviewers
```
Roll no	Optics	Waves	Thermodynamics
MAX	20	20	20
R01	6	15	12
R02	8	17	9
R03	14	12	16
R04	5	18	7
```
Expected answer: Optics and Thermodynamics are flagged to reteach or recap, with the recap groups listed.

## Limits and safety
- **Request size:** up to 512 KB per request, and up to 500 students and 40 chapters per table, the same limits as the website.
- **Rate limit:** 600 requests per 10 minutes per IP address. This is generous because assistants call from shared cloud addresses.
- **No storage:** no accounts, cookies or storage. Logs keep only the size of each request and whether it worked.
- **Not available through assistants:** writing data, the institute code, student report links. Those stay on the website, which keeps the assistant integration privacy-safe and easy to approve.
