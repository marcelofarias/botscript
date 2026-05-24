#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { exit, stderr, stdout } from "node:process";

import {
  BotscriptError,
  PRIMER,
  buildModuleEffects,
  formatExplain,
  formatSource,
  getErrorCode,
  listErrorCodes,
  transform,
} from "@mbfarias/botscript-compiler";
import type { Diagnostic, ModuleEffects } from "@mbfarias/botscript-compiler";

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
    case "fmt":
      await fmtCmd(argv.slice(1));
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
      `  botscript fmt <input> [--check | --write] [--format text|json]\n` +
      `                                          Rewrite *.bs to canonical form (RFC #13).\n` +
      `                                          With no flag and a single file, prints to stdout.\n` +
      `                                          With a directory, --write is the default.\n` +
      `                                          --check exits 1 if any file differs from canonical.\n` +
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
    files = await collectBs(inputAbs, true);
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
  // Scan the project directory (not just the files being compiled) so that
  // single-file invocations still get cross-file DEP001/DEP002/THR001 checks.
  const effectFiles = inputStat.isDirectory() ? files : await collectBs(baseDir);
  const moduleEffects = await loadModuleEffects(effectFiles);
  const written: string[] = [];
  for (const f of files) {
    const src = await readFile(f, "utf8");
    let code: string;
    try {
      ({ code } = transform(src, { filename: f, moduleEffects }));
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
  const files = inputStat.isDirectory() ? await collectBs(inputAbs, true) : [inputAbs];
  if (files.length === 0) {
    if (format === "json") {
      stdout.write(JSON.stringify({ ok: true, checked: 0, files: [] } satisfies CheckOk) + "\n");
    } else {
      stderr.write(`no *.bs files found under ${input}\n`);
    }
    return;
  }
  const effectFiles = inputStat.isDirectory() ? files : await collectBs(dirname(inputAbs));
  const moduleEffects = await loadModuleEffects(effectFiles);
  const allDiagnostics: Diagnostic[] = [];
  for (const f of files) {
    const src = await readFile(f, "utf8");
    try {
      transform(src, { filename: f, moduleEffects });
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

interface FmtArgs {
  input: string;
  mode: "stdout" | "check" | "write";
  format: "text" | "json";
}

function parseFmtArgs(args: string[]): FmtArgs {
  let input: string | undefined;
  let mode: "stdout" | "check" | "write" | undefined;
  let format: "text" | "json" = "text";
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--check") {
      if (mode && mode !== "check") throw new Error(`conflicting flags: --check vs --${mode}`);
      mode = "check";
    } else if (a === "--write" || a === "-w") {
      if (mode && mode !== "write") throw new Error(`conflicting flags: --write vs --${mode}`);
      mode = "write";
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
  return { input, mode: mode ?? "stdout", format };
}

interface FmtCheckOk {
  ok: true;
  checked: number;
  unformatted: string[];
}
interface FmtWriteOk {
  ok: true;
  written: number;
  files: string[];
}

async function fmtCmd(args: string[]): Promise<void> {
  const parsed = parseFmtArgs(args);
  const { input, format } = parsed;
  const inputAbs = resolve(input);
  const inputStat = await stat(inputAbs);
  const isDir = inputStat.isDirectory();
  const files = isDir ? await collectBs(inputAbs, true) : [inputAbs];

  // A directory + no explicit mode defaults to --write. A single file + no
  // explicit mode prints to stdout (gofmt-style).
  const mode: "stdout" | "check" | "write" =
    parsed.mode === "stdout" && isDir ? "write" : parsed.mode;

  if (files.length === 0) {
    if (format === "json") {
      stdout.write(
        JSON.stringify(
          mode === "check"
            ? ({ ok: true, checked: 0, unformatted: [] } satisfies FmtCheckOk)
            : ({ ok: true, written: 0, files: [] } satisfies FmtWriteOk),
        ) + "\n",
      );
    } else {
      stderr.write(`no *.bs files found under ${input}\n`);
    }
    return;
  }

  if (mode === "stdout") {
    // Single-file print to stdout. With multiple files this would be
    // ambiguous; only allowed when input is one file.
    if (files.length !== 1) {
      throw new Error("stdout mode requires a single file; pass --check or --write");
    }
    if (format === "json") {
      throw new Error("--format json requires --check or --write; stdout mode prints raw source");
    }
    const f = files[0]!;
    const src = await readFile(f, "utf8");
    stdout.write(formatSource(src));
    return;
  }

  if (mode === "check") {
    const unformatted: string[] = [];
    for (const f of files) {
      const src = await readFile(f, "utf8");
      const out = formatSource(src);
      if (out !== src) unformatted.push(f);
    }
    if (format === "json") {
      stdout.write(
        JSON.stringify({ ok: unformatted.length === 0, checked: files.length, unformatted } satisfies
          | FmtCheckOk
          | { ok: false; checked: number; unformatted: string[] }) + "\n",
      );
    } else if (unformatted.length === 0) {
      stdout.write(`checked ${files.length} file${files.length === 1 ? "" : "s"} — all canonical\n`);
    } else {
      for (const f of unformatted) stderr.write(`not canonical: ${f}\n`);
      stderr.write(
        `${unformatted.length} of ${files.length} file${
          files.length === 1 ? "" : "s"
        } need formatting; run \`botscript fmt ${input} --write\`\n`,
      );
    }
    if (unformatted.length > 0) exit(1);
    return;
  }

  // mode === "write"
  const written: string[] = [];
  for (const f of files) {
    const src = await readFile(f, "utf8");
    const out = formatSource(src);
    if (out !== src) {
      await writeFile(f, out);
      written.push(f);
    }
  }
  if (format === "json") {
    stdout.write(
      JSON.stringify({ ok: true, written: written.length, files: written } satisfies FmtWriteOk) +
        "\n",
    );
  } else if (written.length === 0) {
    stdout.write(
      `checked ${files.length} file${files.length === 1 ? "" : "s"} — already canonical\n`,
    );
  } else {
    stdout.write(
      `formatted ${written.length} of ${files.length} file${files.length === 1 ? "" : "s"}\n`,
    );
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

// Read a set of project `.bs` files and build their cross-file effect map.
// File IO lives here; the parse/merge/keying logic is shared with the Vite
// plugin via the compiler's buildModuleEffects so the two cannot drift.
// Unreadable files are skipped so a single bad file can't break a build.
async function loadModuleEffects(files: string[]): Promise<ModuleEffects> {
  const sources: string[] = [];
  for (const f of files) {
    try {
      sources.push(await readFile(f, "utf8"));
    } catch {
      // Unreadable file — skip; cross-file checking degrades gracefully.
    }
  }
  return buildModuleEffects(sources);
}

// strict=true is used for primary file discovery (build/check/fmt): an
// unreadable root directory is a hard error, not a silent empty result.
// strict=false (default) is used for moduleEffects scanning: a missing or
// unreadable directory degrades gracefully without breaking compilation.
// Subdirectory failures are always silently skipped in both modes.
async function collectBs(root: string, strict = false): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (err) {
    if (strict)
      throw new Error(
        `cannot read directory ${root}: ${err instanceof Error ? err.message : String(err)}`,
      );
    return out;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
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
