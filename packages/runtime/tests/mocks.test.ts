import { afterEach, describe, expect, it } from "vitest";

import { random, time } from "../src/effects.js";
import { __resetSources } from "../src/effects.js";
import { $withMocks } from "../src/mocks.js";

afterEach(() => {
  __resetSources();
});

describe("$withMocks", () => {
  it("makes time.now() deterministic and monotonic", async () => {
    const samples: number[] = [];
    await $withMocks(["time"], () => {
      samples.push(time.now());
      samples.push(time.now());
      samples.push(time.now());
    });
    expect(samples).toEqual([0, 1, 2]);
  });

  it("makes random.next() deterministic", async () => {
    const samples: number[] = [];
    await $withMocks(["random"], () => {
      samples.push(random.next());
      samples.push(random.next());
    });
    expect(samples[0]).toBeCloseTo(0.001);
    expect(samples[1]).toBeCloseTo(0.002);
  });

  it("restores real sources after the body returns", async () => {
    await $withMocks(["time"], () => {
      expect(time.now()).toBe(0);
    });
    // After the harness, time.now() is back to wallclock.
    const real = time.now();
    expect(real).toBeGreaterThan(1_000_000_000_000); // > year 2001 in ms
  });

  it("restores sources even when the body throws", async () => {
    await expect(
      $withMocks(["time"], async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const real = time.now();
    expect(real).toBeGreaterThan(1_000_000_000_000);
  });

  it("only mocks the capabilities you ask for", async () => {
    await $withMocks(["time"], () => {
      // time is mocked
      expect(time.now()).toBe(0);
      // random is NOT mocked — still real
      const r = random.next();
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    });
  });

  it("returns the body's return value", async () => {
    const v = await $withMocks(["time"], () => 42);
    expect(v).toBe(42);
  });

  it("awaits async body before restoring sources", async () => {
    await $withMocks(["time"], async () => {
      const a = time.now();
      await new Promise((r) => setTimeout(r, 5));
      const b = time.now();
      // Even across the await, the mock source is still the deterministic counter.
      expect(b).toBe(a + 1);
    });
  });
});
