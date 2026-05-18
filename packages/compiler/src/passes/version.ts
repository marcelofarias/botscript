/**
 * Language version directive.
 *
 *   ?bs 0.1     declares this file targets botscript 0.1
 *
 * The directive must appear at the top of the file (before any non-comment
 * code, but after `?primer` if present). The compiler reads it, validates
 * that the requested version is supported, and stores it on the result so
 * downstream tooling can branch on it.
 *
 * Why bake it in: every language that didn't do this from day one (JS, Python,
 * even early TS) eventually grew a confusing matrix of "what features are on
 * in this file." Rust editions and Python `from __future__` imports both
 * exist because retrofitting was painful. We get the cheap win up front.
 *
 * Forward compatibility rule: a file pinned to 0.1 must continue to compile
 * exactly the same way under 0.2, 0.3, etc. New syntax goes behind new
 * version pins. Nothing about a 0.1 file's *output* may change once shipped.
 */
import { BotscriptError } from "../diagnostics.js";
import { locationOf } from "./_location.js";

export const SUPPORTED_VERSIONS: ReadonlyArray<string> = ["0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9"];
export const LATEST_VERSION = "0.1";

const DIRECTIVE_RE = /^\s*\?bs\s+(\d+\.\d+(?:\.\d+)?)\s*$/m;

export interface VersionInfo {
  declared: string | null;
  resolved: string;
}

/**
 * Parse and strip the `?bs <version>` directive. Returns the (possibly
 * unchanged) source plus the resolved version. Throws if the directive
 * names an unsupported version.
 */
export function passVersion(src: string): { src: string; version: VersionInfo } {
  // Walk past leading whitespace + comments, but DON'T cross primer comment
  // blocks the prior pass may have inserted — we look at the source as-is.
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end === -1) break;
      i = end + 2;
      continue;
    }
    break;
  }

  // Tolerate `?primer` appearing before `?bs` — strip past it to find the
  // version. The primer pass runs after this one and will still consume it.
  if (src.startsWith("?primer", i)) {
    let k = i + "?primer".length;
    while (k < src.length && src[k] !== "\n") k++;
    while (k < src.length) {
      const c = src[k];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") {
        k++;
        continue;
      }
      break;
    }
    i = k;
  }

  if (!src.startsWith("?bs", i)) {
    return { src, version: { declared: null, resolved: LATEST_VERSION } };
  }

  // Consume to end of line, parse version.
  let j = i + 3;
  // Skip whitespace.
  while (j < src.length && (src[j] === " " || src[j] === "\t")) j++;
  const versionStart = j;
  while (j < src.length && src[j] !== "\n") j++;
  const version = src.slice(versionStart, j).trim();

  if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
    const { line, column } = locationOf(src, i);
    throw new BotscriptError([
      {
        code: "BS001",
        severity: "error",
        file: null,
        line,
        column,
        message: `malformed \`?bs\` directive — expected a version like \`0.1\`, got "${version}"`,
        rule: "the `?bs` directive must be followed by a version like `<major>.<minor>`",
        idiom: `\`?bs 0.1\` at the top of a .bs file pins it to language version 0.1`,
        rewrite: `?bs ${LATEST_VERSION}`,
      },
    ]);
  }
  if (!SUPPORTED_VERSIONS.includes(version)) {
    const { line, column } = locationOf(src, i);
    throw new BotscriptError([
      {
        code: "BS002",
        severity: "error",
        file: null,
        line,
        column,
        message: `unsupported version "${version}". This compiler supports: ${SUPPORTED_VERSIONS.join(", ")}`,
        rule: "every `?bs <version>` must name a version this compiler ships",
        idiom: "pin a file to a known language version with `?bs <version>`",
        rewrite: `?bs ${LATEST_VERSION}`,
      },
    ]);
  }

  // Strip the directive content but KEEP the trailing newline so subsequent
  // line numbers in diagnostics still match the user's original file.
  const stripped = src.slice(0, i) + src.slice(j);

  return { src: stripped, version: { declared: version, resolved: version } };
}

/**
 * Compare two version strings of the form `<major>.<minor>` (or longer), with
 * missing components defaulting to 0. Returns true iff `actual >= min`. Single
 * source of truth for version comparison; passes that gate behaviour on the
 * resolved version import this rather than ship their own copy.
 */
export function atLeast(actual: string, min: string): boolean {
  const a = actual.split(".").map(Number);
  const m = min.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, m.length); i++) {
    const av = a[i] ?? 0;
    const mv = m[i] ?? 0;
    if (av > mv) return true;
    if (av < mv) return false;
  }
  return true;
}

