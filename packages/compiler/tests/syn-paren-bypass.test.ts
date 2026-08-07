/**
 * Tests for parenthesized-call and paren-receiver bypass detection.
 *
 * `(fetch)(url)`, `((eval))(code)`, etc. are syntactically equivalent to
 * `fetch(url)` and `eval(code)` at runtime but bypass token-level SYN checks
 * because the ident is not immediately followed by `(`.
 *
 * `(Math).random()`, `(localStorage).getItem()`, etc. bypass member-access checks
 * because the receiver ident is not directly followed by `.` or `?.`.
 *
 * Fixed in SYN004, SYN007, SYN008, SYN009, SYN010, SYN012, SYN013, SYN014,
 * SYN017, SYN025, SYN026, SYN027, SYN028, SYN030, SYN031, SYN032
 * via `resolveParenGroupedCallIdx`.
 *
 * Fixed in SYN003, SYN005, SYN006, SYN015, SYN016, SYN018, SYN019, SYN020,
 * SYN021, SYN022, SYN023, SYN024, SYN029, SYN034, SYN035, SYN036, SYN038,
 * SYN039, SYN041, SYN042 via `resolveParenGroupedMemberReceiverIdx`.
 *
 * Fixed in SYN037 via inline paren-group backward walk: `(eval).call(null, code)`,
 * `(fetch).call(null, url)`, `((WebSocket)).bind(null)` etc. now fire SYN037.
 * Tests for SYN037 paren bypass are in syn037-check.test.ts.
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

// ── Paren-receiver bypass: (global).member — member-access checks ────────────
//
// These are a different bypass class from the paren-grouped call `(fetch)(url)`.
// Here the receiver is wrapped in parens: `(Math).random()`, so the ident is
// not directly followed by `.` and evades token-level member-access guards.
// Fixed via `resolveParenGroupedMemberReceiverIdx`.

describe("SYN003 paren-receiver bypass", () => {
  it("fires on (console).log(x)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: string) -> void {\n" +
      "  (console).log(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN003")).toBe(true);
  });

  it("fires on ((console)).warn(x) — double paren", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: string) -> void {\n" +
      "  ((console)).warn(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN003")).toBe(true);
  });

  it("does not fire on (console) with no member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return (console)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN003")).toBe(false);
  });
});

describe("SYN005 paren-receiver bypass", () => {
  it("fires on (process).env", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return (process).env\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN005")).toBe(true);
  });
});

describe("SYN015 paren-receiver bypass", () => {
  it("fires on (localStorage).getItem(key)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return (localStorage).getItem(key)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on (sessionStorage).setItem(key, val)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string, val: string) -> void {\n" +
      "  (sessionStorage).setItem(key, val)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on ((localStorage)).removeItem(key) — double paren", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> void {\n" +
      "  ((localStorage)).removeItem(key)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("does not fire on (localStorage) with no member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const x = (localStorage)\n" +
      "  return x\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return unsafe \"accesses localStorage for caching\" { (localStorage).getItem(key) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN015")).toBe(false);
  });
});

describe("SYN016 paren-receiver bypass", () => {
  it("fires on (indexedDB).open(name)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(name: string) -> any {\n" +
      "  return (indexedDB).open(name)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN016")).toBe(true);
  });
});

describe("SYN018 paren-receiver bypass", () => {
  it("fires on (Math).random()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return (Math).random()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN018")).toBe(true);
  });

  it("fires on ((Math)).random() — double paren", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return ((Math)).random()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN018")).toBe(true);
  });

  it("does not fire on (Math).abs(x) — non-random member", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: number) -> number {\n" +
      "  return (Math).abs(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN018")).toBe(false);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return unsafe \"uses Math.random for game\" { (Math).random() }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN018")).toBe(false);
  });
});

describe("SYN019 paren-receiver bypass", () => {
  it("fires on (crypto).getRandomValues(arr)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(arr: Uint8Array) -> void {\n" +
      "  (crypto).getRandomValues(arr)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN019")).toBe(true);
  });

  it("fires on (crypto).randomUUID()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> string {\n" +
      "  return (crypto).randomUUID()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN019")).toBe(true);
  });
});

describe("SYN020 paren-receiver bypass", () => {
  it("fires on (Date).now()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return (Date).now()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on ((Date)).now() — double paren", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return ((Date)).now()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("does not fire on (Date).parse(str) — non-ambient member", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(str: string) -> number {\n" +
      "  return (Date).parse(str)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("suppressed inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return unsafe \"uses current time for logging\" { (Date).now() }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN020")).toBe(false);
  });
});

describe("SYN021 paren-receiver bypass", () => {
  it("fires on (performance).now()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return (performance).now()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN021")).toBe(true);
  });

  it("fires on (performance).timeOrigin", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return (performance).timeOrigin\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN021")).toBe(true);
  });
});

describe("SYN023 paren-receiver bypass", () => {
  it("fires on (navigator).userAgent", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> string {\n" +
      "  return (navigator).userAgent\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });
});

describe("SYN024 paren-receiver bypass", () => {
  it("fires on (document).cookie", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> string {\n" +
      "  return (document).cookie\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN024")).toBe(true);
  });
});

describe("SYN029 paren-receiver bypass", () => {
  it("fires on (document).write(html)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(html: string) -> void {\n" +
      "  (document).write(html)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires on (document).writeln(html)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(html: string) -> void {\n" +
      "  (document).writeln(html)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN029")).toBe(true);
  });
});

describe("SYN034 paren-receiver bypass", () => {
  it("fires on (location).href", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> string {\n" +
      "  return (location).href\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN034")).toBe(true);
  });
});

describe("SYN035 paren-receiver bypass", () => {
  it("fires on (history).pushState(state, title, url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(state: any, title: string, url: string) -> void {\n" +
      "  (history).pushState(state, title, url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN035")).toBe(true);
  });
});

describe("SYN036 paren-receiver bypass", () => {
  it("fires on (WebAssembly).instantiate(bytes, imports)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(bytes: any, imports: any) -> any {\n" +
      "  return (WebAssembly).instantiate(bytes, imports)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN036")).toBe(true);
  });
});
