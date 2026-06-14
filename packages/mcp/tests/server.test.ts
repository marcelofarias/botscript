import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createServer } from "../src/server.js";
import { EXPLANATIONS, KNOWN_CODES } from "../src/explanations.js";

async function connectedClient(): Promise<{ client: Client; close: () => Promise<void> }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: {} });
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function asJson(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const first = result.content[0];
  if (!first || first.type !== "text" || typeof first.text !== "string") {
    throw new Error("expected single text content");
  }
  return JSON.parse(first.text);
}

describe("botscript-mcp explanations", () => {
  it("ships an explanation for every known code", () => {
    for (const code of KNOWN_CODES) {
      const e = EXPLANATIONS[code];
      expect(e, `${code} missing`).toBeDefined();
      expect(e!.code).toBe(code);
      expect(e!.title.length).toBeGreaterThan(0);
      expect(e!.body.length).toBeGreaterThan(0);
      expect(e!.example.fails.length).toBeGreaterThan(0);
      expect(e!.example.passes.length).toBeGreaterThan(0);
    }
  });

  it("known codes match the diagnostic codes the compiler emits", () => {
    // Stable contract: every diagnostic code emitted by the compiler must
    // have an entry in EXPLANATIONS so `explain` can answer for it.
    expect(KNOWN_CODES).toEqual([
      "ALI001",
      "ALI002",
      "ALI003",
      "BS001",
      "BS002",
      "CAP001",
      "CAP002",
      "CAP003",
      "DEP001",
      "DEP002",
      "DEP003",
      "DEP004",
      "EFF002",
      "EFF003",
      "EFF004",
      "FMT001",
      "INT001",
      "INT002",
      "INT003",
      "INT004",
      "INT005",
      "MAT001",
      "MAT002",
      "MAT003",
      "MAT004",
      "RES001",
      "RES002",
      "SYN001",
      "SYN002",
      "SYN003",
      "SYN004",
      "SYN005",
      "SYN006",
      "SYN007",
      "SYN008",
      "SYN010",
      "SYN011",
      "SYN012",
      "SYN013",
      "SYN014",
      "SYN016",
      "SYN018",
      "SYN019",
      "SYN022",
      "SYN023",
      "THR001",
      "THR002",
      "THR003",
      "THR004",
      "UNS001",
      "UNS002",
      "UNS003",
      "UNS004",
      "UNS005",
      "VER001",
      "VER002",
      "VER003",
    ]);
  });

  it("each example pair represents a real fails/passes contrast", async () => {
    // The fails example must either throw a BotscriptError carrying the
    // matching code (errors) OR compile successfully but return a warning with
    // the matching code (warning-only diagnostics like CAP003). The passes
    // example must compile without errors or warnings for that code.
    const { transform, BotscriptError } = await import("@mbfarias/botscript-compiler");
    for (const code of KNOWN_CODES) {
      const { example } = EXPLANATIONS[code]!;
      let threwOrWarned = false;
      try {
        const result = transform(example.fails);
        // Didn't throw — check for a matching warning.
        const warn = result.warnings.find((w) => w.code === code);
        expect(warn, `fails example for ${code} produced neither an error nor a warning`).toBeDefined();
        threwOrWarned = true;
      } catch (e) {
        expect(e, `${code} fails example threw wrong type`).toBeInstanceOf(BotscriptError);
        const err = e as InstanceType<typeof BotscriptError>;
        expect(err.diagnostics[0]!.code, `${code} mismatched code`).toBe(code);
        threwOrWarned = true;
      }
      expect(threwOrWarned).toBe(true);
      // passes example should compile clean with no matching warning.
      const passResult = transform(example.passes);
      const passWarn = passResult.warnings.find((w) => w.code === code);
      expect(passWarn, `passes example for ${code} still has warning`).toBeUndefined();
    }
  });
});

describe("botscript-mcp server (over InMemoryTransport)", () => {
  let conn: Awaited<ReturnType<typeof connectedClient>>;

  beforeEach(async () => {
    conn = await connectedClient();
  });

  afterEach(async () => {
    await conn.close();
  });

  it("lists the three tools", async () => {
    const { tools } = await conn.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["explain", "primer", "transform"]);
  });

  it("primer returns the language spec", async () => {
    const result = await conn.client.callTool({ name: "primer", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(text).toContain("botscript v0.1 — primer");
    expect(text).toContain("== TAGGED UNIONS (0.2+) ==");
  });

  it("transform compiles a simple .bs source", async () => {
    const result = await conn.client.callTool({
      name: "transform",
      arguments: { source: `?bs 0.2\nfn slug(s: string) -> string = pure { s.toLowerCase() }\n` },
    });
    const parsed = asJson(result as never) as {
      ok: boolean;
      code: string;
      forms: string[];
      version: { resolved: string };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.version.resolved).toBe("0.2");
    expect(parsed.code).toContain("function slug(s: string)");
    expect(parsed.forms).toContain("fn");
  });

  it("transform returns a structured diagnostic on failure", async () => {
    const result = await conn.client.callTool({
      name: "transform",
      arguments: {
        source: `?bs 0.2\nfn now() -> number = pure { time.now() }\n`,
        filename: "/tmp/example.bs",
      },
    });
    const parsed = asJson(result as never) as {
      ok: false;
      diagnostics: Array<{ code: string; file: string; line: number; rewrite: string }>;
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]!.code).toBe("CAP001");
    expect(parsed.diagnostics[0]!.file).toBe("/tmp/example.bs");
    expect(parsed.diagnostics[0]!.rewrite).toContain("uses { time }");
  });

  it("explain returns the long-form explanation for a known code", async () => {
    const result = await conn.client.callTool({
      name: "explain",
      arguments: { code: "CAP001" },
    });
    const parsed = asJson(result as never) as {
      code: string;
      title: string;
      example: { fails: string; passes: string };
    };
    expect(parsed.code).toBe("CAP001");
    expect(parsed.title).toBe("Capability not declared");
    expect(parsed.example.passes).toContain("uses { time }");
  });

  it("explain returns an error for an unknown code", async () => {
    const result = await conn.client.callTool({
      name: "explain",
      arguments: { code: "XYZ999" },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(text).toContain("unknown diagnostic code: XYZ999");
  });

  it("transform with malformed source returns BS001", async () => {
    const result = await conn.client.callTool({
      name: "transform",
      arguments: { source: `?bs nope\n` },
    });
    const parsed = asJson(result as never) as {
      ok: false;
      diagnostics: Array<{ code: string }>;
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.diagnostics[0]!.code).toBe("BS001");
  });
});
