/**
 * `test "name" { … }` — botscript's built-in test form.
 *
 * The compiler rewrites `test "name" { body }` into `$test("name", () => { body })`.
 * Under vitest, we re-export the global `test` so this just works. When run
 * standalone (no vitest), `$test` accumulates and runs cases on first tick.
 */

type TestFn = () => void | Promise<void>;
type Registered = { name: string; fn: TestFn };

const queue: Registered[] = [];
let scheduled = false;

const isVitest = (): boolean =>
  typeof globalThis !== "undefined" &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (globalThis as any).__vitest_worker__ !== "undefined";

export const $test = (name: string, fn: TestFn): void => {
  if (isVitest()) {
    // Lazy import so this file works without vitest at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vitestTest = (globalThis as any).test;
    if (typeof vitestTest === "function") {
      vitestTest(name, fn);
      return;
    }
  }
  queue.push({ name, fn });
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(runStandalone);
  }
};

async function runStandalone(): Promise<void> {
  let failed = 0;
  for (const t of queue.splice(0)) {
    try {
      await t.fn();
      console.log(`  ok  - ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  fail - ${t.name}\n    ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (failed > 0) process.exitCode = 1;
}

export const $assert = (cond: unknown, msg?: string): void => {
  if (!cond) {
    throw new Error(
      msg ??
        "assert failed.\n" +
          "  Idiom:   `assert x == y` is the inline form; use `assert.equal` for richer diffs.\n" +
          "  Rewrite: import { equal } from \"@botscript/runtime/assert\"; equal(x, y)",
    );
  }
};
