import { describe, expect, it } from "vitest";

import { $current, $enter, $require, CapabilityViolation } from "../src/capabilities.js";

// No afterEach reset: each `$enter` runs the test body in its own
// AsyncLocalStorage scope, so the store ends naturally when the
// callback returns.
describe("capabilities", () => {

  it("$enter installs a frame and $require checks it", () => {
    $enter(["net"], () => {
      expect($current()).toEqual(["net"]);
      expect(() => $require("net")).not.toThrow();
    });
  });

  it("$require throws CapabilityViolation when capability not granted", () => {
    expect(() =>
      $enter([], () => {
        $require("net");
      }),
    ).toThrow(CapabilityViolation);
  });

  it("error message names the missing capability and the rewrite", () => {
    try {
      $enter(["fs"], () => $require("net"));
    } catch (e) {
      expect(e).toBeInstanceOf(CapabilityViolation);
      const msg = (e as Error).message;
      expect(msg).toContain("net");
      expect(msg).toContain("Idiom:");
      expect(msg).toContain("Rewrite:");
    }
  });

  it("nested frames are independent", () => {
    $enter(["fs"], () => {
      $enter(["net"], () => {
        expect($current()).toEqual(["net"]);
        expect(() => $require("net")).not.toThrow();
        expect(() => $require("fs")).toThrow(CapabilityViolation);
      });
      expect($current()).toEqual(["fs"]);
      expect(() => $require("fs")).not.toThrow();
    });
  });

  it("top-level (no frame) is permissive", () => {
    expect(() => $require("net")).not.toThrow();
    expect($current()).toBeUndefined();
  });

  it("frames pop even when callback throws", () => {
    expect(() =>
      $enter(["net"], () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect($current()).toBeUndefined();
  });

  it("async callback: frame outlives awaits, then pops after settle", async () => {
    let duringAwait: readonly string[] | undefined;
    const result = await $enter(["net"], async () => {
      // Yield to the microtask queue, then re-check the frame.
      await Promise.resolve();
      duringAwait = $current();
      // A second $require after the await must still see the frame.
      expect(() => $require("net")).not.toThrow();
      return 42;
    });
    expect(result).toBe(42);
    expect(duringAwait).toEqual(["net"]);
    // After the promise settles the frame is gone.
    expect($current()).toBeUndefined();
  });

  it("async callback: frame pops even when the promise rejects", async () => {
    await expect(
      $enter(["net"], async () => {
        await Promise.resolve();
        throw new Error("async boom");
      }),
    ).rejects.toThrow("async boom");
    expect($current()).toBeUndefined();
  });

  it("concurrent async $enter calls do not bleed capabilities into each other", async () => {
    // Two overlapping async tasks with disjoint capability sets must each see
    // their own frame regardless of interleaving order. With a module-level
    // mutable stack one task's pop would corrupt the other's top.
    const a = $enter(["net"], async () => {
      await Promise.resolve();
      const seen = $current();
      expect(seen).toEqual(["net"]);
      expect(() => $require("net")).not.toThrow();
      expect(() => $require("fs")).toThrow(CapabilityViolation);
      await Promise.resolve();
      return seen;
    });
    const b = $enter(["fs"], async () => {
      await Promise.resolve();
      const seen = $current();
      expect(seen).toEqual(["fs"]);
      expect(() => $require("fs")).not.toThrow();
      expect(() => $require("net")).toThrow(CapabilityViolation);
      return seen;
    });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual(["net"]);
    expect(rb).toEqual(["fs"]);
    expect($current()).toBeUndefined();
  });
});
