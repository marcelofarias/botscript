#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { exit, stderr, stdout } from "node:process";

import {
  BotscriptError,
  PRIMER,
  formatExplain,
  getErrorCode,
  listErrorCodes,
  transform,
} from "@mbfarias/botscript-compiler";
import type { Diagnostic } from "@mbfarias/botscript-compiler";

const argv = process.argv.slice(2);
const cmd = argv[0];

async function main(): Promise<void> {
  switch (cmd) {
    case undefined:
    case "-h":
    case "--help":
    case "help":
      printUsage();
      return;
    case "primer":
      stdout.write(PRIMER + "\n");
      return;
    case "build":
      await buildCmd(argv.slice(1));
      return;
    case "check":
      await checkCmd(argv.slice(1));
      return;
    case "explain":
      explainCmd(argv.slice(1));
      return;
    default:
      stderr.write(`unknown command: ${cmd}\n`);
      printUsage();
      exit(2);
  }
}

function printUsage(): void {
  stdout.write(
    `botscript — small TypeScript-superset for code mostly written by machines.\n` +
      `\n` +
      `Usage:\n` +
      `  botscript build <input> [--out <dir>] [--format text|json]\n` +
      `                                          Compile *.bs files to *.ts.\n` +
      `  botscript check <input> [--format text|json]\n` +
      `                                          Type-/syntax-check without writing files.\n` +
      `  botscript explain <CODE>                Print rule/idiom/rewrite for an error code.\n` +
      `  botscript explain --list                List every diagnostic code.\n` +
      `  botscript primer                        Print the language primer.\n` +
      `  botscript help                          Show this message.\n` +
      `\n` +
      `If <input> is a directory, every *.bs file underneath is compiled/checked.\n` +
      `If --out is omitted, output sits next to each input as <name>.ts.\n` +
      `--format json emits machine-parseable diagnostics on success or failure.\n`,
  );
}

interface BuildArgs {
  input: string;
  out?: string;
  format: "text" | "json";
}

function parseBuildArgs(args: string[]): BuildArgs {
  let input: string | undefined;
  let out: string | undefined;
  let format: "text" | "json" = "text";
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out" || a === "-o") {
      out = args[++i];
    } else if (a === "--format" || a === "-f") {
      const v = args[++i];
      if (v !== "text" && v !== "json") {
        throw new Error(`unknown --format: ${v} (expected text|json)`);
      }
      format = v;
    } else if (input === undefined) {
      input = a;
    } else {
      throw new Error(`unexpected argument: ${a}`);
    }
  }
  if (input === undefined) throw new Error("missing input path");
  return { input, out, format };
}

interface BuildOk {
  ok: true;
  compiled: number;
  files: string[];
}
interface BuildErr {
  ok: false;
  diagnostics: Diagnostic[];
}

async function buildCmd(args: string[]): Promise<void> {
  const { input, out, format } = parseBuildArgs(args);
  const inputAbs = resolve(input);
  const inputStat = await stat(inputAbs);
  let files: string[];
  let baseDir: string;
  if (inputStat.isDirectory()) {
    files = await collectBs(inputAbs);
    baseDir = inputAbs;
  } else {
    files = [inputAbs];
    baseDir = dirname(inputAbs);
  }
  if (files.length === 0) {
    if (format === "json") {
      stdout.write(JSON.stringify({ ok: true, compiled: 0, files: [] }) + "\n");
    } else {
      stderr.write(`no *.bs files found under ${input}\n`);
    }
    return;
  }
  const written: string[] = [];
  for (const f of files) {
    const src = await readFile(f, "utf8");
    let code: string;
    try {
      ({ code } = transform(src, { filename: f }));
    } catch (e) {
      if (e instanceof BotscriptError) {
        emitBuildErr({ ok: false, diagnostics: [...e.diagnostics] }, format);
        exit(1);
      }
      throw e;
    }
    const targetRel = relative(baseDir, f).replace(/\.bs$/, ".ts");
    const target = out ? resolve(out, targetRel) : f.replace(/\.bs$/, ".ts");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, code);
    written.push(target);
  }
  if (format === "json") {
    stdout.write(JSON.stringify({ ok: true, compiled: written.length, files: written } satisfies BuildOk) + "\n");
  } else {
    stdout.write(`compiled ${written.length} file${written.length === 1 ? "" : "s"}\n`);
  }
}

function emitBuildErr(payload: BuildErr, format: "text" | "json"): void {
  if (format === "json") {
    stdout.write(JSON.stringify(payload) + "\n");
  } else {
    for (const d of payload.diagnostics) {
      const loc = d.file ? `${d.file}:${d.line}:${d.column}` : `line ${d.line}:${d.column}`;
      stderr.write(`botscript[${d.code}]: ${d.message} (${loc})\n`);
      if (d.rule) stderr.write(`  Rule:    ${d.rule}\n`);
      if (d.idiom) stderr.write(`  Idiom:   ${d.idiom}\n`);
      if (d.rewrite) stderr.write(`  Rewrite: ${d.rewrite}\n`);
    }
  }
}

interface CheckArgs {
  input: string;
  format: "text" | "json";
}

function parseCheckArgs(args: string[]): CheckArgs {
  let input: string | undefined;
  let format: "text" | "json" = "text";
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--format" || a === "-f") {
      const v = args[++i];
      if (v !== "text" && v !== "json") {
        throw new Error(`unknown --format: ${v} (expected text|json)`);
      }
      format = v;
    } else if (input === undefined) {
      input = a;
    } else {
      throw new Error(`unexpected argument: ${a}`);
    }
  }
  if (input === undefined) throw new Error("missing input path");
  return { input, format };
}

interface CheckOk {
  ok: true;
  checked: number;
  files: string[];
}
interface CheckErr {
  ok: false;
  diagnostics: Diagnostic[];
}

async function checkCmd(args: string[]): Promise<void> {
  const { input, format } = parseCheckArgs(args);
  const inputAbs = resolve(input);
  const inputStat = await stat(inputAbs);
  const files = inputStat.isDirectory() ? await collectBs(inputAbs) : [inputAbs];
  if (files.length === 0) {
    if (format === "json") {
      stdout.write(JSON.stringify({ ok: true, checked: 0, files: [] } satisfies CheckOk) + "\n");
    } else {
      stderr.write(`no *.bs files found under ${input}\n`);
    }
    return;
  }
  const allDiagnostics: Diagnostic[] = [];
  for (const f of files) {
    const src = await readFile(f, "utf8");
    try {
      transform(src, { filename: f });
    } catch (e) {
      if (e instanceof BotscriptError) {
        allDiagnostics.push(...e.diagnostics);
        continue;
      }
      throw e;
    }
  }
  if (allDiagnostics.length > 0) {
    emitBuildErr({ ok: false, diagnostics: allDiagnostics }, format);
    exit(1);
  }
  if (format === "json") {
    stdout.write(
      JSON.stringify({ ok: true, checked: files.length, files } satisfies CheckOk) + "\n",
    );
  } else {
    stdout.write(`checked ${files.length} file${files.length === 1 ? "" : "s"} — ok\n`);
  }
}

function explainCmd(args: string[]): void {
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    stdout.write(
      `botscript explain <CODE>     Print rule/idiom/rewrite for an error code.\n` +
        `botscript explain --list     List every diagnostic code.\n`,
    );
    return;
  }
  if (args[0] === "--list") {
    for (const e of listErrorCodes()) {
      stdout.write(`  ${e.code}  ${e.title}\n`);
    }
    return;
  }
  const code = (args[0] ?? "").toUpperCase();
  const entry = getErrorCode(code);
  if (!entry) {
    stderr.write(`botscript: unknown error code: ${args[0]}\n`);
    stderr.write(`Run \`botscript explain --list\` to see every code.\n`);
    exit(2);
  }
  stdout.write(formatExplain(entry) + "\n");
}

async function collectBs(root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      out.push(...(await collectBs(p)));
    } else if (e.isFile() && e.name.endsWith(".bs")) {
      out.push(p);
    }
  }
  return out;
}

main().catch((err) => {
  stderr.write(`botscript: ${err instanceof Error ? err.message : String(err)}\n`);
  exit(1);
});
