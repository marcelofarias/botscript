/**
 * Canonical registry of botscript diagnostics.
 *
 * Every error code the compiler emits has one entry here. Passes pull
 * `rule` / `idiom` / `rewrite` from this registry rather than inlining
 * strings, so `bs explain <CODE>` and the diagnostics agents see in their
 * tool output stay in sync.
 *
 * Keep entries terse. A bot reads these in a tool result; a human reads
 * them in a terminal. Either way, three lines is plenty.
 */

export interface ErrorCodeEntry {
  /** Stable code, e.g. "CAP001". */
  code: string;
  /** One-line title, suitable for `bs explain` header. */
  title: string;
  /** Full sentence: the language rule. */
  rule: string;
  /** The canonical pattern that solves this class of problem. */
  idiom: string;
  /** A literal rewrite a bot can apply. */
  rewrite: string;
  /** A short before/after example block, plain text. */
  example: string;
}

const E: Record<string, ErrorCodeEntry> = {
  CAP001: {
    code: "CAP001",
    title: "function calls a stdlib namespace whose capability is not declared",
    rule:
      "every fn must declare in its `uses { ... }` clause every capability it (or its callees) consume",
    idiom:
      "declare every capability the function consumes; pure helpers stay pure",
    rewrite:
      "fn name(...) uses { …existing, missing } -> ...",
    example:
      "// before\n" +
      "fn now() -> number = pure { time.now() }\n\n" +
      "// after\n" +
      "fn now() uses { time } -> number = pure { time.now() }",
  },
  CAP002: {
    code: "CAP002",
    title: "function over-declares a capability it never reaches",
    rule:
      "a function may not declare a capability it does not transitively consume — declarations must match reality",
    idiom:
      "declarations are the upper bound the compiler infers; remove caps that nothing in the body uses",
    rewrite:
      "fn name(...) uses { …only the caps actually used } -> ...",
    example:
      "// before\n" +
      "fn slug(s: string) uses { net } -> string = pure { s.toLowerCase() }\n\n" +
      "// after\n" +
      "fn slug(s: string) -> string = pure { s.toLowerCase() }",
  },
  UNS001: {
    code: "UNS001",
    title: "unsafe block missing justification string",
    rule:
      "an `unsafe` block must carry a non-empty string literal explaining why the escape hatch is acceptable here",
    idiom:
      "every cast/escape hatch in a diff carries a one-line reason — the next reviewer sees the why, not just the what",
    rewrite:
      'unsafe "<short reason>" { <body> }',
    example:
      "// before\n" +
      "unsafe { return value as User }\n\n" +
      "// after\n" +
      'unsafe "third-party lib types `Response` as any" { return value as User }',
  },
  UNS002: {
    code: "UNS002",
    title: "unsafe block followed by an empty justification",
    rule:
      "the justification on an `unsafe` block must be a non-empty string — the empty string is not a reason",
    idiom:
      "if you cannot articulate the reason in one sentence, the cast probably should not be made",
    rewrite:
      'unsafe "<short reason>" { <body> }',
    example:
      "// before\n" +
      'unsafe "" { return value as User }\n\n' +
      "// after\n" +
      'unsafe "Response.json() returns any" { return value as User }',
  },
  UNS003: {
    code: "UNS003",
    title: "unsafe block has no body",
    rule:
      "an `unsafe` block must be followed by `{ ... }` — the form is `unsafe \"<reason>\" { <body> }`",
    idiom:
      "the body of an unsafe block scopes the escape hatch as narrowly as possible",
    rewrite:
      'unsafe "<short reason>" { <body> }',
    example:
      "// before\n" +
      'unsafe "fix me later"\n\n' +
      "// after\n" +
      'unsafe "Response.json() returns any" { return value as User }',
  },
  UNS004: {
    code: "UNS004",
    title: "bare `as` cast outside unsafe block",
    rule:
      "every `as` is a claim the compiler cannot verify; from `?bs 0.5` it must be justified by a written reason inside an `unsafe \"<reason>\" { ... }` block",
    idiom:
      "wrap the cast in `unsafe \"<reason>\" { ... }`; the reason becomes the review record on the cast",
    rewrite:
      'unsafe "<short reason>" { <expr> as <type> }',
    example:
      "// before\n" +
      "?bs 0.5\n" +
      "const u = data as User;\n\n" +
      "// after\n" +
      "?bs 0.5\n" +
      'const u = unsafe "Response.json() returns any" { data as User };',
  },
  FMT001: {
    code: "FMT001",
    title: "source is not in canonical form",
    rule:
      "every botscript program has exactly one canonical surface form (RFC #13); from `?bs 0.4` on, the compiler rejects non-canonical input rather than silently accepting whitespace variants",
    idiom:
      "run `botscript fmt <file> --write` once; from then on the source is canonical and compiles cleanly",
    rewrite:
      "botscript fmt <file> --write",
    example:
      "// before — multi-space directive, alignment padding, trailing whitespace\n" +
      "?bs   0.4\n" +
      "fn add(a: number, b: number) -> number   =   a + b   \n\n" +
      "// after — canonical\n" +
      "?bs 0.4\n" +
      "fn add(a: number, b: number) -> number = a + b",
  },
  INT001: {
    code: "INT001",
    title: "intent declares 'pure' but function has capability declarations",
    rule:
      "a function whose intent contains 'pure' must have no capability declarations — " +
      "pure functions are deterministic, side-effect-free, and access no external resources",
    idiom:
      "remove uses { ... } from a pure function, or change the intent to reflect the actual behaviour",
    rewrite:
      "// option A — remove the uses clause:\n" +
      "fn name(args) intent: \"pure\" -> type = ...\n\n" +
      "// option B — remove the intent claim:\n" +
      "fn name(args) uses { caps } -> type = ...",
    example:
      "// before — intent says pure, body hits the network\n" +
      "?bs 0.7\n" +
      "fn greet(name: string) uses { net } intent: \"pure\" -> string = ...\n\n" +
      "// after — intent matches the declaration\n" +
      "?bs 0.7\n" +
      "fn greet(name: string) intent: \"pure\" -> string = ...",
  },
  INT002: {
    code: "INT002",
    title: "intent declares 'pure' but function body uses a capability",
    rule:
      "a function declaring intent: \"pure\" must not directly reference any stdlib capability " +
      "in its body — the pure claim means deterministic and side-effect-free",
    idiom:
      "move the capability usage out of the pure fn, or change the intent to reflect the actual behaviour",
    rewrite:
      "// option A — remove the capability call from the body:\n" +
      "fn name(args) intent: \"pure\" -> type = pure { ... }\n\n" +
      "// option B — remove the pure intent claim:\n" +
      "fn name(args) uses { cap } -> type = ...",
    example:
      "// before — fn says pure but body calls http.get\n" +
      "?bs 0.7\n" +
      "fn fetchUser(id: string) intent: \"pure\" -> string {\n" +
      "  return http.get(\"/users/\" + id);\n" +
      "}\n\n" +
      "// after — remove pure claim and declare the capability\n" +
      "?bs 0.7\n" +
      "fn fetchUser(id: string) uses { net } -> string {\n" +
      "  return http.get(\"/users/\" + id);\n" +
      "}",
  },
  RES001: {
    code: "RES001",
    title: "Result.try block has no body",
    rule:
      "the form is `Result.try { <body> }` (or `Result.tryAsync { <body> }`) — the braces are required",
    idiom:
      "use Result.try to lift a throwing JS-boundary call into a Result without writing a try/catch by hand",
    rewrite:
      "Result.try { <body that may throw> }",
    example:
      "// before\n" +
      "let parsed = JSON.parse(input)\n\n" +
      "// after\n" +
      "let parsed = Result.try { JSON.parse(input) }?",
  },
};

export function getErrorCode(code: string): ErrorCodeEntry | undefined {
  return E[code];
}

export function listErrorCodes(): ErrorCodeEntry[] {
  return Object.values(E).sort((a, b) => a.code.localeCompare(b.code));
}

/** Format an entry as the multi-line text shown by `bs explain`. */
export function formatExplain(entry: ErrorCodeEntry): string {
  return [
    `botscript[${entry.code}]: ${entry.title}`,
    "",
    `  Rule:    ${entry.rule}`,
    `  Idiom:   ${entry.idiom}`,
    `  Rewrite: ${entry.rewrite}`,
    "",
    "Example:",
    indent(entry.example, 2),
  ].join("\n");
}

function indent(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l.length === 0 ? l : pad + l))
    .join("\n");
}
