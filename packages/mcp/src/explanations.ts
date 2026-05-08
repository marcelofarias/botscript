/**
 * Long-form explanations for every stable diagnostic code. The `explain` tool
 * looks up the code here and returns the expanded version. The short form
 * (rule + idiom + rewrite) ships with every diagnostic; this is the deeper
 * "why does this rule exist" doc.
 *
 * Adding a new code: also add a row to AGENTS.md's diagnostic codes table.
 */

export interface Explanation {
  code: string;
  title: string;
  /** A multi-paragraph explanation of why the rule exists. */
  body: string;
  /** A worked-example pair: a snippet that fails, and a snippet that passes. */
  example: { fails: string; passes: string };
}

export const EXPLANATIONS: Readonly<Record<string, Explanation>> = {
  BS001: {
    code: "BS001",
    title: "Malformed `?bs` directive",
    body:
      "The first directive in a botscript file declares the language version it targets. " +
      "It must look like `?bs <major>.<minor>` or `?bs <major>.<minor>.<patch>`. " +
      "Anything else (a typo, a word, a partial version) makes the directive ambiguous, " +
      "and an ambiguous version is the only thing in this language that compounds — every " +
      "downstream pass branches on it.",
    example: {
      fails: "?bs nope\nfn x() -> number = pure { 1 }\n",
      passes: "?bs 0.2\nfn x() -> number = pure { 1 }\n",
    },
  },
  BS002: {
    code: "BS002",
    title: "Unsupported `?bs` version",
    body:
      "The version you pinned is syntactically valid but this compiler does not ship " +
      "support for it. Either upgrade @mbfarias/botscript-compiler, or pin to a version " +
      "this compiler knows about (see SUPPORTED_VERSIONS in the compiler).",
    example: {
      fails: "?bs 99.0\n",
      passes: "?bs 0.2\n",
    },
  },
  CAP001: {
    code: "CAP001",
    title: "Capability not declared",
    body:
      "A function reached for a capability-checked stdlib namespace (http, time, random, " +
      "fs, stdout, stderr) without naming the matching capability in its `uses { … }` " +
      "clause. Under ?bs 0.2 this is a direct-only check; under ?bs 0.3 the compiler also " +
      "propagates capabilities transitively across calls to other fns in the same file, " +
      "and the diagnostic names the path: `loadOne -> doFetch -> http.get`.\n\n" +
      "Aliasing (`const t = time; t.now()`) is still not detected, by design — the rule is " +
      "'the canonical names are tripwires.' Cross-module propagation is not yet in scope; " +
      "the runtime $require backs that case up.",
    example: {
      fails: "?bs 0.3\nfn now() -> number = pure { time.now() }\n",
      passes: "?bs 0.3\nfn now() uses { time } -> number { return time.now(); }\n",
    },
  },
  CAP002: {
    code: "CAP002",
    title: "Capability over-declared",
    body:
      "A function declared a capability in its `uses { … }` clause but its body never " +
      "reaches it — neither directly (no `time.now()`, `http.get()`, etc.) nor transitively " +
      "via a callee in the same file. The declaration is the upper bound the compiler " +
      "infers against; declarations must match reality.\n\n" +
      "Why bother flagging this: a declaration that doesn't match the body is a lie a future " +
      "reader (human or model) will trust. Either remove the unused capability, or if you're " +
      "truly preparing to use it, add the call now. (CAP002 is a 0.3+ check — files pinned " +
      "to 0.2 keep the original direct-only behavior.)",
    example: {
      fails: "?bs 0.3\nfn slug(s: string) uses { net } -> string = pure { s.toLowerCase() }\n",
      passes: "?bs 0.3\nfn slug(s: string) -> string = pure { s.toLowerCase() }\n",
    },
  },
  UNS001: {
    code: "UNS001",
    title: "unsafe block missing justification string",
    body:
      "An `unsafe` block must carry a non-empty string literal explaining why the escape " +
      "hatch is acceptable here. The form is `unsafe \"<reason>\" { <body> }`. The " +
      "justification ends up as a leading comment in the compiled output, so the diff " +
      "reviewer (human or model) sees the *why* alongside the cast — not just the cast.\n\n" +
      "If you cannot articulate the reason in one sentence, the cast probably should not " +
      "be made. (UNS001 is a 0.3+ check — files pinned to 0.2 do not parse `unsafe` as a " +
      "keyword and treat it as an ordinary identifier.)",
    example: {
      fails: "?bs 0.3\nconst u = unsafe { value as User };\n",
      passes: "?bs 0.3\nconst u = unsafe \"third-party returns any\" { value as User };\n",
    },
  },
  UNS002: {
    code: "UNS002",
    title: "unsafe block has an empty justification",
    body:
      "The justification on an `unsafe` block must be a non-empty string. The empty string " +
      "is not a reason. Same intent as UNS001: the cast and its reason live together in the " +
      "diff so the next reviewer can judge whether the escape hatch is still warranted.",
    example: {
      fails: "?bs 0.3\nconst u = unsafe \"\" { value as User };\n",
      passes: "?bs 0.3\nconst u = unsafe \"Response.json() returns any\" { value as User };\n",
    },
  },
  UNS003: {
    code: "UNS003",
    title: "unsafe block has no body",
    body:
      "The form is `unsafe \"<reason>\" { <body> }` — the braces are required. A justification " +
      "without a body has no scope; the escape hatch must enclose exactly the expression that " +
      "needs the cast.",
    example: {
      fails: "?bs 0.3\nconst u = unsafe \"fix later\";\n",
      passes: "?bs 0.3\nconst u = unsafe \"fix later\" { value as User };\n",
    },
  },
  RES001: {
    code: "RES001",
    title: "Result.try block has no body",
    body:
      "The form is `Result.try { <body> }` (or `Result.tryAsync { <body> }`). The block " +
      "lifts a throwing JS-boundary call into `Result<T, string>` so the result composes " +
      "with the `?` unwrap operator instead of leaking try/catch into your fn body.",
    example: {
      fails: "?bs 0.3\nconst r = Result.try;\n",
      passes: "?bs 0.3\nconst r = Result.try { JSON.parse(input) };\n",
    },
  },
};

export const KNOWN_CODES = Object.keys(EXPLANATIONS).sort();
