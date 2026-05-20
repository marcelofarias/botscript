#!/usr/bin/env node
/**
 * botscript-mcp — Model Context Protocol server for the botscript compiler.
 *
 * Exposes three tools so a model can discover and use the language without
 * reading docs out-of-band:
 *
 *   - primer    : returns the canonical language spec (same as `botscript primer`).
 *   - transform : compiles a .bs source string; returns either the .ts code +
 *                 detected forms, or a structured diagnostic.
 *   - explain   : given a stable diagnostic code (BS001, BS002, CAP001, …),
 *                 returns a long-form "why this rule exists" explanation
 *                 plus a fails/passes example pair.
 *
 * Wire it up with:
 *
 *   claude mcp add botscript -- npx -y @mbfarias/botscript-mcp
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { BotscriptError, PRIMER, transform } from "@mbfarias/botscript-compiler";

import { EXPLANATIONS, KNOWN_CODES } from "./explanations.js";

const SERVER_NAME = "botscript";
const SERVER_VERSION = "0.3.0";

/**
 * Construct a fresh Server with the botscript tool handlers wired up. Call
 * site is responsible for connecting it to a transport (stdio for the binary,
 * InMemoryTransport for tests).
 */
export function createServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "primer",
      description:
        "Return the canonical botscript language primer (same text the `?primer` directive emits). Read this first before writing any .bs.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "transform",
      description:
        "Compile a .bs source string to TypeScript. On success, returns { ok: true, code, forms, version, warnings } where warnings is an array of non-blocking diagnostics (e.g. CAP003). On failure, returns { ok: false, diagnostics } where each diagnostic has { code, file?, line, column, message, rule?, idiom?, rewrite? }.",
      inputSchema: {
        type: "object",
        properties: {
          source: { type: "string", description: "The .bs source to compile." },
          filename: {
            type: "string",
            description:
              "Optional filename; attached to diagnostics so callers can locate errors.",
          },
        },
        required: ["source"],
        additionalProperties: false,
      },
    },
    {
      name: "explain",
      description:
        `Given a stable diagnostic code (one of: ${KNOWN_CODES.join(", ")}), return a long-form explanation of why the rule exists, plus a fails/passes example pair. Use this when a transform diagnostic has a code you don't recognize.`,
      inputSchema: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: `The diagnostic code. Known: ${KNOWN_CODES.join(", ")}.`,
          },
        },
        required: ["code"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  switch (name) {
    case "primer":
      return text(PRIMER);

    case "transform": {
      const source = args.source;
      const filename = typeof args.filename === "string" ? args.filename : undefined;
      if (typeof source !== "string") {
        return errorText("transform: `source` must be a string");
      }
      try {
        const { code, forms, version, warnings } = transform(source, filename ? { filename } : {});
        return json({ ok: true, code, forms, version, warnings: [...warnings] });
      } catch (e) {
        if (e instanceof BotscriptError) {
          return json({ ok: false, diagnostics: [...e.diagnostics] });
        }
        return errorText(`transform: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case "explain": {
      const code = args.code;
      if (typeof code !== "string") {
        return errorText("explain: `code` must be a string");
      }
      const expl = EXPLANATIONS[code];
      if (!expl) {
        return errorText(
          `unknown diagnostic code: ${code}. Known codes: ${KNOWN_CODES.join(", ")}`,
        );
      }
      return json(expl);
    }

    default:
      return errorText(`unknown tool: ${name}`);
  }
  });

  return server;
}

function text(s: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: s }] };
}

function json(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorText(s: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return { content: [{ type: "text", text: s }], isError: true };
}

// Stdio entrypoint — only runs when invoked as the bin script, not when
// imported (e.g. from tests).
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  await createServer().connect(new StdioServerTransport());
}
