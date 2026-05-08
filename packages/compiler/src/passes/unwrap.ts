import { stepOne } from "../lex.js";

/**
 * Postfix `?` on a Result expression: unwraps the Ok value, or short-circuits
 * the enclosing function with the Err.
 *
 *   let x = expr?       ->  const __r1 = expr; if (__r1.kind === "err") return __r1; const x = __r1.value;
 *   const x = expr?     ->  same with const
 *   return expr?        ->  const __r1 = expr; if (__r1.kind === "err") return __r1; return __r1.value;
 *   expr?               ->  const __r1 = expr; if (__r1.kind === "err") return __r1;
 *
 * The `?` must be at end-of-statement: followed by optional `;` and then
 * whitespace/newline/eof. Optional chaining (`foo?.bar`) and ternaries are
 * unaffected because they don't end the line.
 */
export function passUnwrap(src: string): string {
  // Walk line by line, but preserving original line endings.
  // For each line that ends in `?` or `?;`, identify the statement and rewrite.
  const lines = src.split("\n");
  let counter = 0;
  const out: string[] = [];
  // Track whether we're inside a `/* ... */` block comment as we step lines.
  let inBlockComment = false;

  let buf = "";
  for (const rawLine of lines) {
    if (buf !== "") buf += "\n" + rawLine;
    else buf = rawLine;

    // If we're inside an unbalanced multi-line construct (string/template),
    // accumulate. Crude check: if line has unmatched template-literal backtick.
    if (isInsideTemplate(buf)) continue;

    // Update block-comment state for this line and skip rewriting if we're
    // inside one. Strict rule: the unwrap pass never touches comment content.
    const wasInComment = inBlockComment;
    inBlockComment = updateBlockCommentState(buf, inBlockComment);
    if (wasInComment || inBlockComment || isCommentLine(buf)) {
      out.push(buf);
      buf = "";
      continue;
    }

    const result = rewriteLine(buf, counter);
    if (result === null) {
      out.push(buf);
      buf = "";
      continue;
    }
    counter = result.counter;
    out.push(result.replacement);
    buf = "";
  }
  if (buf !== "") out.push(buf);
  return out.join("\n");
}

/** Returns true if the line is wholly a single-line or JSDoc-continuation comment. */
function isCommentLine(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

/** Walk the line and flip block-comment state on opening/closing markers. */
function updateBlockCommentState(line: string, inComment: boolean): boolean {
  let i = 0;
  while (i < line.length) {
    if (inComment) {
      const close = line.indexOf("*/", i);
      if (close === -1) return true;
      i = close + 2;
      inComment = false;
      continue;
    }
    const c = line[i];
    if (c === '"' || c === "'" || c === "`") {
      i = stepOne(line, i);
      continue;
    }
    if (c === "/" && line[i + 1] === "/") return inComment;
    if (c === "/" && line[i + 1] === "*") {
      inComment = true;
      i += 2;
      continue;
    }
    i++;
  }
  return inComment;
}

function rewriteLine(line: string, counter: number): { replacement: string; counter: number } | null {
  // Find a `?` at end of line (allowing optional `;` and trailing whitespace).
  const m = line.match(/^(\s*)(.*?)\?\s*;?\s*$/s);
  if (!m) return null;
  const indent = m[1] ?? "";
  const stmt = (m[2] ?? "").trim();
  if (stmt === "") return null;

  // Reject if the `?` looks like part of a ternary or optional chain.
  // Heuristic: the char immediately before `?` must be `)`, `]`, identifier, or quote-end.
  const beforeQ = stmt[stmt.length - 1];
  if (!beforeQ) return null;
  const isUnwrapPos =
    /[A-Za-z0-9_$\)\]'"`]/.test(beforeQ) &&
    !looksLikeOptionalChain(line);
  if (!isUnwrapPos) return null;

  // Detect statement form.
  const letMatch = stmt.match(/^(let|const|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::\s*[^=]+)?\s*=\s*(.+)$/s);
  const returnMatch = stmt.match(/^return\s+(.+)$/s);

  const id = `__r${counter + 1}`;
  let replacement: string;

  if (letMatch) {
    const kw = letMatch[1]!;
    const name = letMatch[2]!;
    const expr = letMatch[3]!.trim();
    replacement =
      `${indent}const ${id} = ${expr};\n` +
      `${indent}if (${id}.kind === "err") return ${id};\n` +
      `${indent}${kw === "var" ? "let" : kw} ${name} = ${id}.value;`;
  } else if (returnMatch) {
    const expr = returnMatch[1]!.trim();
    replacement =
      `${indent}const ${id} = ${expr};\n` +
      `${indent}if (${id}.kind === "err") return ${id};\n` +
      `${indent}return ${id}.value;`;
  } else {
    // Bare expression statement.
    replacement =
      `${indent}const ${id} = ${stmt};\n` +
      `${indent}if (${id}.kind === "err") return ${id};`;
  }

  return { replacement, counter: counter + 1 };
}

function looksLikeOptionalChain(line: string): boolean {
  // If the `?` we see is followed by `.` or `[` or `(`, it's optional chaining.
  // Since we already match end-of-line, this can't be true, so always false.
  return false;
}

function isInsideTemplate(buf: string): boolean {
  let i = 0;
  let inTemplate = false;
  while (i < buf.length) {
    const c = buf[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (inTemplate) {
      if (c === "`") inTemplate = false;
      else if (c === "$" && buf[i + 1] === "{") {
        // skip ${...}
        let depth = 1;
        i += 2;
        while (i < buf.length && depth > 0) {
          if (buf[i] === "{") depth++;
          else if (buf[i] === "}") depth--;
          i++;
        }
        continue;
      }
      i++;
      continue;
    }
    if (c === "`") {
      inTemplate = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      i = stepOne(buf, i);
      continue;
    }
    i++;
  }
  return inTemplate;
}
