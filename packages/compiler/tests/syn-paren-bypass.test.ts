/**
 * Tests for parenthesized-call bypass detection.
 *
 * `(fetch)(url)`, `((eval))(code)`, etc. are syntactically equivalent to
 * `fetch(url)` and `eval(code)` at runtime but bypass token-level SYN checks
 * because the ident is not immediately followed by `(`.
 *
 * Fixed in SYN004, SYN007, SYN008, SYN009, SYN010, SYN012, SYN013, SYN014,
 * SYN017, SYN025, SYN026, SYN027, SYN028, SYN030, SYN031, SYN032
 * via `resolveParenGroupedCallIdx`.
 * The remaining SYN cases (SYN011, SYN015–SYN016, SYN018–SYN024, SYN029,
 * SYN033–SYN036) still have this gap where applicable; this file tracks what IS fixed.
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

// ── SYN017: (Notification)() ──────────────────────────────────────────────────

describe("SYN017 paren-grouped bypass", () => {
  it("fires on (Notification)(title)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(title: string) -> any {\n" +
      "  return (Notification)(title)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN017")).toBe(true);
  });

  it("fires on new (Notification)(title)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(title: string) -> any {\n" +
      "  return new (Notification)(title)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN017")).toBe(true);
  });

  it("still fires on direct new Notification(title) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(title: string) -> any {\n" +
      "  return new Notification(title)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN017")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(title: string) -> any {\n" +
      "  return unsafe \"sends browser notification\" { (Notification)(title) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN017")).toBe(false);
  });
});

// ── SYN025: (requestAnimationFrame)() ────────────────────────────────────────

describe("SYN025 paren-grouped bypass", () => {
  it("fires on (requestAnimationFrame)(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return (requestAnimationFrame)(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("still fires on direct requestAnimationFrame(cb) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return requestAnimationFrame(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return unsafe \"schedules animation frame callback\" { (requestAnimationFrame)(cb) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });
});

// ── SYN026: (requestIdleCallback)() ──────────────────────────────────────────

describe("SYN026 paren-grouped bypass", () => {
  it("fires on (requestIdleCallback)(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return (requestIdleCallback)(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return unsafe \"schedules idle callback\" { (requestIdleCallback)(cb) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN026")).toBe(false);
  });
});

// ── SYN027: (MutationObserver)() / (IntersectionObserver)() ──────────────────

describe("SYN027 paren-grouped bypass", () => {
  it("fires on (MutationObserver)(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return (MutationObserver)(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("fires on new (IntersectionObserver)(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return new (IntersectionObserver)(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("still fires on direct new MutationObserver(cb) — no regression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return new MutationObserver(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return unsafe \"observes DOM for changes\" { (MutationObserver)(cb) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN027")).toBe(false);
  });
});

// ── SYN028: (Proxy)() ─────────────────────────────────────────────────────────

describe("SYN028 paren-grouped bypass", () => {
  it("fires on (Proxy)(target, handler)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(target: any, handler: any) -> any {\n" +
      "  return (Proxy)(target, handler)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires on new (Proxy)(target, handler)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(target: any, handler: any) -> any {\n" +
      "  return new (Proxy)(target, handler)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(target: any, handler: any) -> any {\n" +
      "  return unsafe \"proxies target for logging\" { (Proxy)(target, handler) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN028")).toBe(false);
  });
});

// ── SYN030: (FinalizationRegistry)() ─────────────────────────────────────────

describe("SYN030 paren-grouped bypass", () => {
  it("fires on (FinalizationRegistry)(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return (FinalizationRegistry)(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("fires on new (FinalizationRegistry)(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return new (FinalizationRegistry)(cb)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(cb: any) -> any {\n" +
      "  return unsafe \"registers GC callback for cleanup\" { (FinalizationRegistry)(cb) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN030")).toBe(false);
  });
});

// ── SYN031: (MessageChannel)() ───────────────────────────────────────────────

describe("SYN031 paren-grouped bypass", () => {
  it("fires on (MessageChannel)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return (MessageChannel)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on new (MessageChannel)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return new (MessageChannel)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return unsafe \"creates message channel for IPC\" { (MessageChannel)() }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN031")).toBe(false);
  });
});

// ── SYN032: (RTCPeerConnection)() ────────────────────────────────────────────

describe("SYN032 paren-grouped bypass", () => {
  it("fires on (RTCPeerConnection)(config)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(config: any) -> any {\n" +
      "  return (RTCPeerConnection)(config)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires on new (RTCPeerConnection)(config)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(config: any) -> any {\n" +
      "  return new (RTCPeerConnection)(config)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(config: any) -> any {\n" +
      "  return unsafe \"opens WebRTC peer connection for video\" { (RTCPeerConnection)(config) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN032")).toBe(false);
  });
});
