import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { $enter, $reset, CapabilityViolation } from "../src/capabilities.js";
import { http } from "../src/effects.js";
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

describe("http wrappers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    $reset();
  });

  it("get wraps a successful response in Ok", async () => {
    const mockResponse = new Response("hello", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));
    const r = await $enter(["net"], () => http.get("https://example.com"));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(mockResponse);
  });

  it("get wraps a network error in Err", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("dns failed")));
    const r = await $enter(["net"], () => http.get("https://example.com"));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toBe("dns failed");
  });

  it("post wraps a successful response in Ok", async () => {
    const mockResponse = new Response("{}", { status: 201 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));
    const r = await $enter(["net"], () => http.post("https://example.com", { body: "{}" }));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(mockResponse);
  });

  it("get wraps a non-Error rejection in Err", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network timeout"));
    const r = await $enter(["net"], () => http.get("https://example.com"));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(Error);
  });

  it("get returns Ok for HTTP error status (non-2xx does not become Err)", async () => {
    const mockResponse = new Response("Not Found", { status: 404 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));
    const r = await $enter(["net"], () => http.get("https://example.com/missing"));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.ok).toBe(false);
      expect(r.value.status).toBe(404);
    }
  });

  it("rejects with CapabilityViolation when net is not in scope", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(
      $enter([], () => http.get("https://example.com")),
    ).rejects.toThrow(CapabilityViolation);
  });
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
