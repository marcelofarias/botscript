/**
 * Token-AST-based match pass. Replaces the regex/brace-counting version.
 */
import { lex } from "../parser/lex.js";
import type { MatchExpr, Pattern } from "../parser/parse-match.js";
import { parseMatch } from "../parser/parse-match.js";

export function passMatch(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "match") continue;
    const expr = parseMatch(tokens, i);
    if (!expr) continue;
    out += src.slice(cursor, tokens[expr.start]!.start);
    out += emitMatch(expr);
    const lastTok = tokens[expr.end - 1];
    cursor = lastTok ? lastTok.end : tokens[expr.end]?.start ?? cursor;
    i = expr.end - 1;
  }
  out += src.slice(cursor);
  return out;
}

function emitMatch(expr: MatchExpr): string {
  const arms = expr.arms.map((a) => {
    const pred = emitPredicate(a.pattern);
    const handler = emitHandler(a.pattern, a.body);
    return `  [${pred}, ${handler}]`;
  });
  return `$match(${expr.scrutinee}, [\n${arms.join(",\n")},\n])`;
}

function emitPredicate(p: Pattern): string {
  switch (p.kind) {
    case "wildcard":
      return "$wildcard()";
    case "literal":
      return `$literalMatch(${p.value})`;
    case "tag":
      return `$tagMatch(${JSON.stringify(p.tag)}, [${p.binds.map((b) => JSON.stringify(b)).join(", ")}])`;
  }
}

function emitHandler(p: Pattern, body: string): string {
  if (p.kind === "tag" && p.binds.length > 0) {
    return `({ ${p.binds.join(", ")} }: any) => (${body})`;
  }
  return `() => (${body})`;
}
