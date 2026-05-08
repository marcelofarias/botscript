#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { exit, stderr, stdout } from "node:process";

import { PRIMER, transform } from "@mbfarias/botscript-compiler";

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
      `  botscript build <input> [--out <dir>]   Compile *.bs files to *.ts.\n` +
      `  botscript primer                        Print the language primer.\n` +
      `  botscript help                          Show this message.\n` +
      `\n` +
      `If <input> is a directory, every *.bs file underneath is compiled.\n` +
      `If --out is omitted, output sits next to each input as <name>.ts.\n`,
  );
}

interface BuildArgs {
  input: string;
  out?: string;
}

function parseBuildArgs(args: string[]): BuildArgs {
  let input: string | undefined;
  let out: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out" || a === "-o") {
      out = args[++i];
    } else if (input === undefined) {
      input = a;
    } else {
      throw new Error(`unexpected argument: ${a}`);
    }
  }
  if (input === undefined) throw new Error("missing input path");
  return { input, out };
}

async function buildCmd(args: string[]): Promise<void> {
  const { input, out } = parseBuildArgs(args);
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
    stderr.write(`no *.bs files found under ${input}\n`);
    return;
  }
  let written = 0;
  for (const f of files) {
    const src = await readFile(f, "utf8");
    const { code } = transform(src, { filename: f });
    const targetRel = relative(baseDir, f).replace(/\.bs$/, ".ts");
    const target = out ? resolve(out, targetRel) : f.replace(/\.bs$/, ".ts");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, code);
    written++;
  }
  stdout.write(`compiled ${written} file${written === 1 ? "" : "s"}\n`);
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
