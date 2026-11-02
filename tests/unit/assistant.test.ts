import { describe, expect, it } from "vitest";
import { handleRpc } from "@/lib/assistant/mcp";
import { runTool, TOOLS } from "@/lib/assistant/tools";

const TABLE = "Roll no\tOptics\tWaves\nMAX\t20\t20\nR01\t6\t15\nR02\t8\t17\nR03\t14\t12\nR04\t5\t18";

describe("MCP server", () => {
  it("initializes with a supported protocol version and lists read-only tools", () => {
    const init = handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect(init?.result).toMatchObject({ protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "heramb-study" } });
    expect(handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    const list = handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }) as { result: { tools: Array<{ name: string; annotations: { readOnlyHint: boolean } }> } };
    expect(list.result.tools.map((t) => t.name)).toEqual(TOOLS.map((t) => t.name));
    expect(list.result.tools.every((t) => t.annotations.readOnlyHint)).toBe(true);
  });
  it("falls back to the latest version for unknown ones, and rejects bad requests", () => {
    expect((handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "1999-01-01" } }) as { result: { protocolVersion: string } }).result.protocolVersion).toBe("2025-06-18");
    expect(handleRpc({ id: 1, method: "x" })?.error?.code).toBe(-32600);
    expect(handleRpc({ jsonrpc: "2.0", id: 3, method: "nope" })?.error?.code).toBe(-32601);
    expect(handleRpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "nope" } })?.error?.code).toBe(-32602);
  });
  it("calls a tool and returns text plus structured content", () => {
    const r = handleRpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "analyse_class_test", arguments: { table: TABLE } } }) as {
      result: { isError: boolean; content: Array<{ text: string }>; structuredContent: { plan: Array<{ chapter: string; action: string }> } };
    };
    expect(r.result.isError).toBe(false);
    expect(r.result.content[0]!.text).toContain("Optics");
    expect(r.result.structuredContent.plan[0]).toMatchObject({ chapter: "Optics", action: "whole_class" });
  });
});

describe("assistant tools", () => {
  it("explains problems instead of guessing", () => {
    const r = runTool("analyse_class_test", { table: "Roll no\nR01" });
    expect(r.ok).toBe(false);
  });
  it("converts OMR options with a key into chapters", () => {
    const r = runTool("convert_question_marks_to_chapters", {
      table: "Roll\tQ1\tQ2\tQ3\tQ4\nR1\tA\tB\tD\tC\nR2\tA\tC\tC\tC\nR3\tB\tB\tC\t",
      paper_map: "1-2: Optics\n3-4: Waves",
      cells: "options_with_key",
      answer_key: "ABCC",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.structured.chapterTable).toContain("Optics");
  });
  it("compares a follow-up test", () => {
    const later = "Roll no\tOptics\tWaves\nMAX\t20\t20\nR01\t14\t15\nR02\t15\t17\nR03\t16\t12\nR04\t9\t18";
    const r = runTool("compare_follow_up_test", { first_table: TABLE, follow_up_table: later });
    expect(r.ok && r.text).toMatch(/Optics\*\*: Improved/);
  });
});
