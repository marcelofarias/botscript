/**
 * Forward-compatibility snapshots.
 *
 * AGENTS.md rule 4: shipped versions of `?bs <pin>` produce identical output
 * forever. This file is the tripwire. Each snapshot freezes the exact compiled
 * output of a representative source under a given pin. If a change in the
 * compiler ever alters that output, the snapshot fails — and the change must
 * be moved behind a NEW pin instead.
 *
 * Maintenance:
 *   - NEVER `--update-snapshots` an existing 0.1/0.2/0.3 snapshot. If a fix
 *     legitimately needs to change shipped output, that's an internal bug
 *     fix only allowed if the new output preserves observable behaviour.
 *     When in doubt: gate behind a new pin.
 *   - When a new pin (0.4, 0.5, …) ships, ADD a new `describe` block here
 *     so future changes are caught the same way.
 */

import { describe, expect, it } from "vitest";

import { transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

// ─────────────────────────────────────────────────────────────────────────────
// ?bs 0.1
// ─────────────────────────────────────────────────────────────────────────────

describe("forward-compat: ?bs 0.1 output is frozen", () => {
  it("primer directive emits the v0.1 primer comment block", () => {
    expect(t(`?bs 0.1\n?primer\nconst x = 1;\n`)).toMatchSnapshot();
  });

  it("fn with uses + block body", () => {
    const src =
      `?bs 0.1\n` +
      `fn ping() uses { net } -> string {\n` +
      `  return "pong";\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("fn with = pure shorthand", () => {
    expect(
      t(`?bs 0.1\nfn slug(s: string) -> string = pure { s.toLowerCase() }\n`),
    ).toMatchSnapshot();
  });

  it("fn with = io shorthand", () => {
    expect(t(`?bs 0.1\nfn now() -> number = io { Date.now() }\n`)).toMatchSnapshot();
  });

  it("fn with = single-expression body", () => {
    expect(t(`?bs 0.1\nfn double(n: number) -> number = n * 2\n`)).toMatchSnapshot();
  });

  it("fn with = match body", () => {
    const src =
      `?bs 0.1\n` +
      `fn area(s: Shape) -> number = match s {\n` +
      `  Circle { r }    -> Math.PI * r * r\n` +
      `  Square { side } -> side * side\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("async fn with uses + body using await", () => {
    const src =
      `?bs 0.1\n` +
      `async fn loadUser(id: string) uses { net } -> Promise<User> {\n` +
      `  const r = await fetch(id);\n` +
      `  return r as User;\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("fn with object literal return type", () => {
    const src =
      `?bs 0.1\n` +
      `fn make() -> { code: string; error: string | null } {\n` +
      `  return { code: "x", error: null };\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("pure { } at expression position", () => {
    expect(t(`?bs 0.1\nconst x = pure { 1 + 2 };\n`)).toMatchSnapshot();
  });

  it("io { } at expression position", () => {
    expect(t(`?bs 0.1\nconst x = io { fetchSomething() };\n`)).toMatchSnapshot();
  });

  it("match with tag, tag-with-binds, literal, wildcard", () => {
    const src =
      `?bs 0.1\n` +
      `const r = match v {\n` +
      `  Tag             -> 1\n` +
      `  Bag { x, y }    -> x + y\n` +
      `  "lit"           -> 2\n` +
      `  _               -> 0\n` +
      `};\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("? unwrap in let / const / return / bare positions", () => {
    const src =
      `?bs 0.1\n` +
      `let a = f()?\n` +
      `const b = g()?\n` +
      `return h()?\n` +
      `i()?\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("optional chaining foo?.bar is preserved", () => {
    expect(t(`?bs 0.1\nconst x = foo?.bar;\n`)).toMatchSnapshot();
  });

  it("assert in statement position", () => {
    expect(t(`?bs 0.1\nassert 1 + 1 === 2;\n`)).toMatchSnapshot();
  });

  it("imports auto-prepend $enter when fn is used", () => {
    expect(t(`?bs 0.1\nfn x() uses { net } -> void { }\n`)).toMatchSnapshot();
  });

  it("test \"name\" { body } rewrites to $test", () => {
    expect(
      t(`?bs 0.1\ntest "ok" { assert 1 === 1; }\n`),
    ).toMatchSnapshot();
  });

  it("integration: primer + multiple fns + test + ? + assert", () => {
    const src =
      `?bs 0.1\n` +
      `?primer\n` +
      `fn slug(s: string) -> string = pure { s.toLowerCase().replaceAll(" ", "-") }\n` +
      `\n` +
      `fn loadUser(id: string) uses { net } -> Result<{name: string}, string> {\n` +
      `  let res = http.get(\`/u/\${id}\`)?\n` +
      `  ok({ name: id })\n` +
      `}\n` +
      `\n` +
      `test "slug works" {\n` +
      `  assert slug("Hello World") === "hello-world";\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ?bs 0.2
// ─────────────────────────────────────────────────────────────────────────────

describe("forward-compat: ?bs 0.2 output is frozen", () => {
  it("tagged union with field-bearing alternatives", () => {
    const src =
      `?bs 0.2\n` +
      `type Shape = Circle { r: number } | Square { side: number };\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("tagged union mixing bare and field-bearing alternatives", () => {
    const src =
      `?bs 0.2\n` +
      `type Status = Idle | Loading | Done { value: string } | Failed { error: string };\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("fn that declares a capability it uses (cap-check passes)", () => {
    const src =
      `?bs 0.2\n` +
      `fn now() uses { time } -> number {\n` +
      `  return time.now();\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("test with mocks { time }", () => {
    const src =
      `?bs 0.2\n` +
      `test "deterministic clock" with mocks { time } {\n` +
      `  assert time.now() === 0;\n` +
      `  assert time.now() === 1;\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("test with mocks { time, random }", () => {
    const src =
      `?bs 0.2\n` +
      `test "deterministic both" with mocks { time, random } {\n` +
      `  assert time.now() === 0;\n` +
      `  assert random.next() === 0;\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("integration: tagged union + match + cap-check + test with mocks", () => {
    const src =
      `?bs 0.2\n` +
      `type Status = Idle | Done { value: string };\n` +
      `\n` +
      `fn label(s: Status) -> string = match s {\n` +
      `  Idle           -> "-"\n` +
      `  Done { value } -> value\n` +
      `}\n` +
      `\n` +
      `fn loadOne(url: string) uses { net } -> string {\n` +
      `  return http.get(url) as unknown as string;\n` +
      `}\n` +
      `\n` +
      `test "labels" with mocks { time } {\n` +
      `  assert label({ kind: "Idle" }) === "-";\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ?bs 0.3
// ─────────────────────────────────────────────────────────────────────────────

describe("forward-compat: ?bs 0.3 output is frozen", () => {
  it("unsafe block with justification", () => {
    const src =
      `?bs 0.3\n` +
      `const u = unsafe "third-party types Response as any" { return value as User };\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("Result.try { body }", () => {
    expect(
      t(`?bs 0.3\nconst r = Result.try { JSON.parse(input) };\n`),
    ).toMatchSnapshot();
  });

  it("Result.tryAsync { body }", () => {
    expect(
      t(`?bs 0.3\nconst r = Result.tryAsync { fetch(url) };\n`),
    ).toMatchSnapshot();
  });

  it("transitive capability inference passes when callees match", () => {
    const src =
      `?bs 0.3\n` +
      `fn doFetch(url: string) uses { net } -> string {\n` +
      `  const res = http.get(url);\n` +
      `  return "x";\n` +
      `}\n` +
      `fn loadOne(url: string) uses { net } -> string {\n` +
      `  return doFetch(url);\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("integration: unsafe + Result.try + cap inference", () => {
    const src =
      `?bs 0.3\n` +
      `fn parseConfig(raw: string) -> Result<{ port: number }, string> {\n` +
      `  let parsed = Result.try { JSON.parse(raw) }?\n` +
      `  let p = unsafe "JSON.parse returns any" { (parsed as { port?: number }).port };\n` +
      `  return typeof p === "number" ? ok({ port: p }) : err("missing port");\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });

  it("capability inference: same-file call graph propagates correctly", () => {
    const src =
      `?bs 0.3\n` +
      `fn helper(s: string) -> string = pure { s.trim() }\n` +
      `fn outer(s: string) -> string {\n` +
      `  return helper(s);\n` +
      `}\n`;
    expect(t(src)).toMatchSnapshot();
  });
});
