import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { $enter, CapabilityViolation } from "../src/capabilities.js";
import { http } from "../src/effects.js";
import { fs } from "../src/fs.js";
import { isErr, isOk } from "../src/result.js";

let tmp = "";

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "botscript-fs-"));
});

afterAll(async () => {
  // No capability reset needed: capability frames are per-async-chain via
  // AsyncLocalStorage, not module-level mutable state. Each test's
  // `$enter` callback runs inside its own ALS scope; there is no global
  // stack to clear between tests. (Note: ALS can still propagate into
  // un-awaited timers/promises spawned inside the callback. The tests
  // here don't leak those, so this is a non-issue in practice.)
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

describe("http wrappers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("post always uses method POST even when init.method is provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    await $enter(["net"], () => http.post("https://example.com", { method: "PUT" as string }));
    expect(mockFetch).toHaveBeenCalledWith("https://example.com", expect.objectContaining({ method: "POST" }));
  });

  it("post wraps a successful response in Ok", async () => {
    const mockResponse = new Response("{}", { status: 201 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));
    const r = await $enter(["net"], () => http.post("https://example.com", { body: "{}" }));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(mockResponse);
  });

  it("get wraps a non-Error rejection in Err and preserves the original via cause", async () => {
    const thrown = { code: "NETWORK_TIMEOUT", retryAfter: 30 };
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(thrown));
    const r = await $enter(["net"], () => http.get("https://example.com"));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error).toBeInstanceOf(Error);
      // The wrapped Error must keep the original throw on `cause` so callers
      // (and debugger / error-reporting surfaces) can inspect it.
      expect((r.error as Error & { cause?: unknown }).cause).toBe(thrown);
    }
  });

  it("get does NOT re-wrap a thrown Error — same instance flows through to Err", async () => {
    const thrown = new Error("dns failed");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(thrown));
    const r = await $enter(["net"], () => http.get("https://example.com"));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBe(thrown);
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
