/**
 * Shared utility for locating `unsafe "reason" { ... }` block ranges.
 * Both syn-check and uns-check need to know which token offsets fall inside
 * an unsafe expression block so they can suppress diagnostics appropriately.
 */

import type { Token } from "../parser/lex.js";
import { nextSignificant } from "./_callgraph.js";

export interface CharRange {
  start: number;
  end: number;
}

/**
 * Returns char-offset ranges covering every `unsafe "reason" { body }`
 * expression block in `tokens`.  `unsafe "reason" fn ...` declarations are
 * intentionally excluded — those are handled by the fn-level unsafe guard,
 * not by range-based suppression.
 */
export function collectUnsafeBlockRanges(tokens: Token[]): CharRange[] {
  const out: CharRange[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "unsafe") continue;

    const j = nextSignificant(tokens, i + 1);
    const head = tokens[j];
    if (!head) continue;

    let braceIdx = -1;
    if (head.kind === "open" && head.text === "{") {
      braceIdx = j;
    } else if (head.kind === "string") {
      const k = nextSignificant(tokens, j + 1);
      const open = tokens[k];
      if (open && open.kind === "open" && open.text === "{") braceIdx = k;
      // `unsafe "reason" fn ...` is a declaration, not an expression block — skip.
    }
    if (braceIdx === -1) continue;

    const open = tokens[braceIdx]!;
    if (open.matchedAt === undefined) continue;
    const close = tokens[open.matchedAt];
    if (!close) continue;

    out.push({ start: open.start, end: close.end });
    i = open.matchedAt;
  }
  return out;
}

export function isInsideRange(offset: number, ranges: CharRange[]): boolean {
  for (const r of ranges) {
    if (offset >= r.start && offset < r.end) return true;
  }
  return false;
}
