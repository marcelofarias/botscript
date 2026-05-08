import { afterEach, describe, expect, it } from "vitest";

import { $current, $enter, $require, $reset, CapabilityViolation } from "../src/capabilities.js";

describe("capabilities", () => {
  afterEach(() => {
    $reset();
  });

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
});
