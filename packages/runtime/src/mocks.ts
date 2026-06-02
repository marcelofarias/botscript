/**
 * Test-only deterministic mock harness for the `with mocks { … }` clause.
 *
 *   test "name" with mocks { time, random } { body }
 *
 * desugars (in passTestMocks) to:
 *
 *   test "name" {
 *     await $withMocks(["time", "random"], async () => { body })
 *   }
 *
 * Inside the body, `time.now()` and `random.next()` return deterministic
 * counter values instead of wallclock / Math.random. The original sources
 * are restored in `finally`, even if the body throws.
 *
 * Today the mocks affect every concurrent reader of `time`/`random` for the
 * duration of the test, because the runtime stdlib singletons hold the
 * source. Vitest runs test bodies serially within a worker, which is the
 * regime this is designed for. Don't call $withMocks from app code.
 */

import { __resetSources, __setRandomSource, __setTimeSource } from "./effects.js";

export type MockableCapability = "time" | "random";

export const $withMocks = async <T>(
  caps: ReadonlyArray<string>,
  fn: () => T | Promise<T>,
): Promise<T> => {
  if (caps.includes("time")) {
    let t = 0;
    __setTimeSource(() => {
      const next = t;
      t += 1;
      return next;
    });
  }
  if (caps.includes("random")) {
    let i = 0;
    __setRandomSource(() => {
      i = (i + 1) % 1000;
      return i / 1000;
    });
  }
  try {
    return await fn();
  } finally {
    __resetSources();
  }
};
