import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { $enter, $reset, CapabilityViolation } from "../src/capabilities.js";
import { fs } from "../src/fs.js";
import { isErr, isOk } from "../src/result.js";

let tmp = "";

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "botscript-fs-"));
});

afterAll(async () => {
  $reset();
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

describe("fs wrappers", () => {
  it("readText returns Err on missing file, never throws", () => {
    $enter(["fs"], () => {
      const r = fs.readText(join(tmp, "missing.txt"));
      expect(isErr(r)).toBe(true);
    });
  });

  it("writeText then readText round-trips", () => {
    $enter(["fs"], () => {
      const path = join(tmp, "round-trip.txt");
      const w = fs.writeText(path, "hello");
      expect(isOk(w)).toBe(true);
      const r = fs.readText(path);
      expect(isOk(r)).toBe(true);
      if (isOk(r)) expect(r.value).toBe("hello");
    });
  });

  it("writeJson then readJson preserve structure", () => {
    $enter(["fs"], () => {
      const path = join(tmp, "obj.json");
      const w = fs.writeJson(path, { a: 1, b: [2, 3] });
      expect(isOk(w)).toBe(true);
      const r = fs.readJson<{ a: number; b: number[] }>(path);
      expect(isOk(r)).toBe(true);
      if (isOk(r)) expect(r.value).toEqual({ a: 1, b: [2, 3] });
    });
  });

  it("readJson returns Err on malformed JSON, never throws", () => {
    $enter(["fs"], () => {
      const path = join(tmp, "bad.json");
      fs.writeText(path, "{not-json");
      const r = fs.readJson(path);
      expect(isErr(r)).toBe(true);
    });
  });

  it("throws CapabilityViolation when fs is not in scope", () => {
    expect(() =>
      $enter([], () => {
        fs.exists(join(tmp, "x"));
      }),
    ).toThrow(CapabilityViolation);
  });
});
