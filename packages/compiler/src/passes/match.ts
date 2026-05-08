import { findOutside, skipBalanced, skipWs, stepOne } from "../lex.js";

/**
 * Rewrites:
 *   match expr { Pat -> arm; Pat -> arm }
 * into:
 *   $match(expr, [
 *     [$tagMatch("Tag", ["a", "b"]), ({ a, b }) => arm],
 *     [$wildcard(), () => arm],
 *   ])
 *
 * Patterns supported:
 *   Tag                    tag-only
 *   Tag { a, b }           tag with field bindings
 *   "literal" / 42 / true  literal scalar
 *   _                      wildcard
 *
 * Arms are separated by `;` or newline. Arm bodies are single expressions.
 * Use `match (expr) { … }` if your scrutinee contains an unbraced object
 * literal — otherwise the first `{` after `match` is taken as the arm block.
 */
export function passMatch(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const idx = findKeyword(src, "match", i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, idx);
    const parsed = parseMatch(src, idx);
    if (!parsed) {
      out += "match";
      i = idx + 5;
      continue;
    }
    out += parsed.emit;
    i = parsed.end;
  }
  return out;
}

interface MatchParse {
  emit: string;
  end: number;
}

function parseMatch(src: string, start: number): MatchParse | null {
  let i = skipWs(src, start + "match".length);

  // Read scrutinee: either `(...)` or up to the first top-level `{`.
  let scrutinee: string;
  if (src[i] === "(") {
    const end = skipBalanced(src, i, "(", ")");
    // Strip the wrapping parens — they're a parser disambiguation hint, not
    // semantically meaningful. The emitted `$match(<inner>, ...)` is cleaner.
    scrutinee = src.slice(i + 1, end - 1).trim();
    i = skipWs(src, end);
  } else {
    const j = findOpeningBrace(src, i);
    if (j === -1) return null;
    scrutinee = src.slice(i, j).trim();
    if (!scrutinee) return null;
    i = j;
  }

  if (src[i] !== "{") return null;
  const blockEnd = skipBalanced(src, i, "{", "}");
  const body = src.slice(i + 1, blockEnd - 1);
  const arms = parseArms(body);
  if (!arms) return null;

  const armsLiteral = arms
    .map((a) => `  [${a.predicate}, ${a.handler}]`)
    .join(",\n");
  const emit = `$match(${scrutinee}, [\n${armsLiteral},\n])`;
  return { emit, end: blockEnd };
}

interface Arm {
  predicate: string;
  handler: string;
}

function parseArms(body: string): Arm[] | null {
  const arms: Arm[] = [];
  let i = 0;
  while (i < body.length) {
    i = skipWs(body, i);
    if (i >= body.length) break;
    // Read pattern up to `->`.
    const arrow = findArrow(body, i);
    if (arrow === -1) return null;
    const patternSrc = body.slice(i, arrow).trim();
    i = arrow + 2;
    i = skipWs(body, i);
    // Read arm body up to `;` or newline at top level.
    const armEnd = findArmEnd(body, i);
    const armBody = body.slice(i, armEnd).trim();
    i = armEnd;
    if (body[i] === ";") i++;

    const arm = compilePattern(patternSrc, armBody);
    if (!arm) return null;
    arms.push(arm);
  }
  return arms.length === 0 ? null : arms;
}

function compilePattern(pat: string, armBody: string): Arm | null {
  pat = pat.trim();

  // Wildcard.
  if (pat === "_") {
    return { predicate: `$wildcard()`, handler: `() => (${armBody})` };
  }

  // Literal — string, number, true/false/null.
  if (
    /^"[^"]*"$/.test(pat) ||
    /^'[^']*'$/.test(pat) ||
    /^-?\d+(\.\d+)?$/.test(pat) ||
    pat === "true" ||
    pat === "false" ||
    pat === "null"
  ) {
    return {
      predicate: `$literalMatch(${pat})`,
      handler: `() => (${armBody})`,
    };
  }

  // Tag with bindings: `Tag { a, b }` or `Tag`
  const tagMatch = pat.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*(\{(.*)\})?$/s);
  if (!tagMatch) return null;
  const tag = tagMatch[1]!;
  const bindBlock = tagMatch[3];
  const binds = bindBlock
    ? bindBlock
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const predicate = `$tagMatch(${JSON.stringify(tag)}, [${binds.map((b) => JSON.stringify(b)).join(", ")}])`;
  const destructure = binds.length > 0 ? `({ ${binds.join(", ")} }: any)` : `()`;
  const handler = `${destructure} => (${armBody})`;
  return { predicate, handler };
}

function findKeyword(src: string, kw: string, from: number): number {
  let i = from;
  while (true) {
    const found = findOutside(src, kw, i);
    if (found === -1) return -1;
    const before = src[found - 1] ?? " ";
    const after = src[found + kw.length] ?? " ";
    const isWordBoundary =
      !/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after);
    if (isWordBoundary) return found;
    i = found + kw.length;
  }
}

function findOpeningBrace(src: string, from: number): number {
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === "{") return i;
    if (c === '"' || c === "'" || c === "`" || (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*"))) {
      i = stepOne(src, i);
      continue;
    }
    if (c === "(") {
      i = skipBalanced(src, i, "(", ")");
      continue;
    }
    if (c === "[") {
      i = skipBalanced(src, i, "[", "]");
      continue;
    }
    i++;
  }
  return -1;
}

function findArrow(src: string, from: number): number {
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`" || (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*"))) {
      i = stepOne(src, i);
      continue;
    }
    if (c === "{") {
      i = skipBalanced(src, i, "{", "}");
      continue;
    }
    if (c === "-" && src[i + 1] === ">") return i;
    if (c === "\n") return -1; // arrow must be on same logical line as pattern
    i++;
  }
  return -1;
}

function findArmEnd(src: string, from: number): number {
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`" || (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*"))) {
      i = stepOne(src, i);
      continue;
    }
    if (c === "{") {
      i = skipBalanced(src, i, "{", "}");
      continue;
    }
    if (c === "(") {
      i = skipBalanced(src, i, "(", ")");
      continue;
    }
    if (c === "[") {
      i = skipBalanced(src, i, "[", "]");
      continue;
    }
    if (c === ";" || c === "\n") return i;
    i++;
  }
  return src.length;
}

