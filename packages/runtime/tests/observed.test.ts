import { describe, expect, it } from "vitest";

import {
  expired,
  freshen,
  mapObserved,
  observe,
  sameSnapshot,
  type Observed,
  type Provenance,
} from "../src/observed.js";

const makeProvenance = (snapshotHash: string, observedAt = 1000): Provenance => ({
  source: "test-agent",
  version: "1.0.0",
  snapshotHash,
  observedAt,
});

describe("Observed<T>", () => {
  // ── observe() ──────────────────────────────────────────────────────────────

  it("observe() wraps a value with provenance", () => {
    const prov = makeProvenance("abc123");
    const obs = observe("hello", prov);
    expect(obs.value).toBe("hello");
    expect(obs.provenance).toBe(prov);
  });

  it("observe() works on object values", () => {
    const prov = makeProvenance("abc123");
    const data = { score: 0.91, model: "gpt-x" };
    const obs = observe(data, prov);
    expect(obs.value).toBe(data);
    expect(obs.provenance.snapshotHash).toBe("abc123");
  });

  it("observe() works on primitives", () => {
    const obs = observe(42, makeProvenance("hash1"));
    expect(obs.value).toBe(42);
  });

  it("observe() works on null and undefined", () => {
    const obs1 = observe(null, makeProvenance("h1"));
    const obs2 = observe(undefined, makeProvenance("h2"));
    expect(obs1.value).toBeNull();
    expect(obs2.value).toBeUndefined();
  });

  // ── sameSnapshot() ─────────────────────────────────────────────────────────

  it("sameSnapshot() returns true when hashes match", () => {
    const a = observe("value-a", makeProvenance("same-hash"));
    const b = observe("value-b", makeProvenance("same-hash"));
    expect(sameSnapshot(a, b)).toBe(true);
  });

  it("sameSnapshot() returns false when hashes differ", () => {
    const a = observe("value-a", makeProvenance("hash-a"));
    const b = observe("value-b", makeProvenance("hash-b"));
    expect(sameSnapshot(a, b)).toBe(false);
  });

  it("sameSnapshot() ignores source, version, and observedAt", () => {
    const a = observe(1, {
      source: "agent-a",
      version: "1.0.0",
      snapshotHash: "shared-hash",
      observedAt: 1000,
    });
    const b = observe(2, {
      source: "agent-b",
      version: "2.5.1",
      snapshotHash: "shared-hash",
      observedAt: 9999,
    });
    expect(sameSnapshot(a, b)).toBe(true);
  });

  it("sameSnapshot() works across different value types", () => {
    const a: Observed<string> = observe("text", makeProvenance("h"));
    const b: Observed<number> = observe(42, makeProvenance("h"));
    expect(sameSnapshot(a, b)).toBe(true);
  });

  // ── expired() ──────────────────────────────────────────────────────────────

  it("expired() returns false when observation is fresh", () => {
    const obs = observe("v", makeProvenance("h", 1000));
    expect(expired(obs, 1500, 1000)).toBe(false); // age = 500ms < 1000ms
  });

  it("expired() returns true when observation is stale", () => {
    const obs = observe("v", makeProvenance("h", 1000));
    expect(expired(obs, 3000, 1000)).toBe(true); // age = 2000ms > 1000ms
  });

  it("expired() returns false at exact boundary (strictly greater)", () => {
    const obs = observe("v", makeProvenance("h", 1000));
    expect(expired(obs, 2000, 1000)).toBe(false); // age = 1000ms, not > 1000ms
  });

  it("expired() returns true one ms past the boundary", () => {
    const obs = observe("v", makeProvenance("h", 1000));
    expect(expired(obs, 2001, 1000)).toBe(true); // age = 1001ms > 1000ms
  });

  // ── freshen() ──────────────────────────────────────────────────────────────

  it("freshen() updates provenance while keeping the same value", () => {
    const original = observe("data", makeProvenance("old-hash", 1000));
    const newProv = makeProvenance("new-hash", 2000);
    const refreshed = freshen(original, newProv);
    expect(refreshed.value).toBe("data");
    expect(refreshed.provenance.snapshotHash).toBe("new-hash");
    expect(refreshed.provenance.observedAt).toBe(2000);
  });

  it("freshen() does not mutate the original observation", () => {
    const original = observe("data", makeProvenance("old-hash", 1000));
    freshen(original, makeProvenance("new-hash", 2000));
    expect(original.provenance.snapshotHash).toBe("old-hash");
  });

  // ── mapObserved() ──────────────────────────────────────────────────────────

  it("mapObserved() transforms the value, preserves provenance", () => {
    const prov = makeProvenance("abc", 1000);
    const obs = observe("hello world", prov);
    const mapped = mapObserved(obs, (s) => s.split(" "));
    expect(mapped.value).toEqual(["hello", "world"]);
    expect(mapped.provenance).toBe(prov);
  });

  it("mapObserved() works with type change", () => {
    const obs = observe("42", makeProvenance("h"));
    const mapped = mapObserved(obs, Number);
    expect(mapped.value).toBe(42);
    expect(mapped.provenance.snapshotHash).toBe("h");
  });

  it("mapObserved() does not mutate the original", () => {
    const obs = observe("hello", makeProvenance("h"));
    mapObserved(obs, (s) => s.toUpperCase());
    expect(obs.value).toBe("hello");
  });

  // ── composition with sameSnapshot + expired ─────────────────────────────

  it("stale-check pattern: reject observation when snapshot changed", () => {
    const cached = observe({ score: 0.91 }, makeProvenance("snapshot-v1", 1000));
    const current = observe({ score: 0.85 }, makeProvenance("snapshot-v2", 2000));

    const isStale = !sameSnapshot(cached, current);
    expect(isStale).toBe(true);
  });

  it("fresh-check pattern: accept observation when same snapshot", () => {
    const cached = observe({ score: 0.91 }, makeProvenance("snapshot-v1", 1000));
    const reference = observe({ inputs: "same" }, makeProvenance("snapshot-v1", 900));

    const isValid = sameSnapshot(cached, reference);
    expect(isValid).toBe(true);
    expect(cached.value.score).toBe(0.91);
  });
});
