/**
 * Tests for parenthesized-call bypass detection.
 *
 * `(fetch)(url)`, `((eval))(code)`, etc. are syntactically equivalent to
 * `fetch(url)` and `eval(code)` at runtime but bypass token-level SYN checks
 * because the ident is not immediately followed by `(`.
 *
 * Fixed in SYN004, SYN007, SYN008, SYN009, SYN010, SYN012, SYN013, SYN014
 * via `resolveParenGroupedCallIdx`.
 * The remaining SYN cases (SYN011, SYN015–SYN036) still have this gap where
 * applicable; this file tracks what IS fixed.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

// ── SYN004: (eval)() and (Function)() ────────────────────────────────────────

describe("SYN004 paren-grouped bypass", () => {
  it("fires on (eval)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (eval)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on ((eval))(code) — double paren", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ((eval))(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on (Function)(body)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(body: string) -> any {\n" +
      "  return (Function)(body)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("still fires on direct eval(code) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("does not fire on arr.find(eval) — reference, not call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(arr: any) -> any {\n" +
      "  return arr.find(eval)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on const f = (eval) — grouping without call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const f = (eval)\n" +
      "  return f\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return unsafe \"needs eval\" { (eval)(code) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(false);
  });
});

// ── SYN007: (fetch)() ────────────────────────────────────────────────────────

describe("SYN007 paren-grouped bypass", () => {
  it("fires on (fetch)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return (fetch)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("fires on ((fetch))(url) — double paren", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return ((fetch))(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("still fires on direct fetch(url) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("does not fire on arr.includes(fetch) — reference, not call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(arr: any) -> any {\n" +
      "  return arr.includes(fetch)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return unsafe \"direct fetch\" { (fetch)(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN007")).toBe(false);
  });
});

// ── SYN008: new (WebSocket)() ────────────────────────────────────────────────

describe("SYN008 paren-grouped bypass", () => {
  it("fires on new (WebSocket)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return new (WebSocket)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on (WebSocket)(url) — without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return (WebSocket)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("still fires on direct new WebSocket(url) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return new WebSocket(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return unsafe \"wraps WS\" { new (WebSocket)(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN008")).toBe(false);
  });
});

// ── SYN010: (setTimeout)() ───────────────────────────────────────────────────

describe("SYN010 paren-grouped bypass", () => {
  it("fires on (setTimeout)(cb, ms)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return (setTimeout)(cb, 100)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("fires on (setInterval)(cb, ms)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return (setInterval)(cb, 100)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("fires on (queueMicrotask)(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return (queueMicrotask)(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("fires on ((setTimeout))(cb, ms) — double paren", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return ((setTimeout))(cb, 100)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("still fires on direct setTimeout(cb, ms) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return setTimeout(cb, 100)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return unsafe \"deferred effect\" { (setTimeout)(cb, 100) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN010")).toBe(false);
  });
});

// ── SYN009: (XMLHttpRequest)() ────────────────────────────────────────────────

describe("SYN009 paren-grouped bypass", () => {
  it("fires on (XMLHttpRequest)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return (XMLHttpRequest)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on new (XMLHttpRequest)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return new (XMLHttpRequest)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on ((XMLHttpRequest))(url) — double paren", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return ((XMLHttpRequest))(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("still fires on direct new XMLHttpRequest() — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return new XMLHttpRequest()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return unsafe \"wraps XHR\" { (XMLHttpRequest)(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN009")).toBe(false);
  });
});

// ── SYN012: (EventSource)() ──────────────────────────────────────────────────

describe("SYN012 paren-grouped bypass", () => {
  it("fires on (EventSource)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return (EventSource)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN012")).toBe(true);
  });

  it("fires on new (EventSource)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return new (EventSource)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN012")).toBe(true);
  });

  it("still fires on direct new EventSource(url) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return new EventSource(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN012")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return unsafe \"wraps SSE\" { (EventSource)(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN012")).toBe(false);
  });
});

// ── SYN013: (Worker)() / (SharedWorker)() ────────────────────────────────────

describe("SYN013 paren-grouped bypass", () => {
  it("fires on new (Worker)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return new (Worker)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN013")).toBe(true);
  });

  it("fires on (Worker)(url) — without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return (Worker)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN013")).toBe(true);
  });

  it("fires on new (SharedWorker)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return new (SharedWorker)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN013")).toBe(true);
  });

  it("still fires on direct new Worker(url) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return new Worker(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN013")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  return unsafe \"spawns worker\" { new (Worker)(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN013")).toBe(false);
  });
});

// ── SYN014: (BroadcastChannel)() ─────────────────────────────────────────────

describe("SYN014 paren-grouped bypass", () => {
  it("fires on (BroadcastChannel)(name)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(name: string) -> any {\n" +
      "  return (BroadcastChannel)(name)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN014")).toBe(true);
  });

  it("fires on new (BroadcastChannel)(name)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(name: string) -> any {\n" +
      "  return new (BroadcastChannel)(name)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN014")).toBe(true);
  });

  it("still fires on direct new BroadcastChannel(name) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(name: string) -> any {\n" +
      "  return new BroadcastChannel(name)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN014")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(name: string) -> any {\n" +
      "  return unsafe \"cross-tab channel\" { (BroadcastChannel)(name) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN014")).toBe(false);
  });
});
