/**
 * Tests for ALI004: ambient JS global aliased — calls via alias bypass SYN checks.
 *
 * ALI004 fires when a module-level const has a direct binding to an ambient JS global
 * monitored by a SYN check (fetch, WebSocket, setTimeout, setInterval, queueMicrotask,
 * EventSource, Worker, SharedWorker, BroadcastChannel, Notification, Math, crypto,
 * console, process, navigator, indexedDB).
 *
 * Warning-level only. Gated on ?bs 0.8+.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

// ---------------------------------------------------------------------------
// ALI004 fires for direct-call globals
// ---------------------------------------------------------------------------

describe("ALI004: fires for direct-call global aliases", () => {
  it("fires for const f = fetch", () => {
    const src = "?bs 0.8\nconst f = fetch\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toContain("f");
    expect(warns[0]!.message).toContain("fetch");
  });

  it("fires for const ws = WebSocket", () => {
    const src = "?bs 0.8\nconst ws = WebSocket\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("ws");
    expect(warns[0]!.message).toContain("WebSocket");
  });

  it("fires for const st = setTimeout", () => {
    const src = "?bs 0.8\nconst st = setTimeout\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("setTimeout");
  });

  it("fires for const si = setInterval", () => {
    const src = "?bs 0.8\nconst si = setInterval\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
  });

  it("fires for const qm = queueMicrotask", () => {
    const src = "?bs 0.8\nconst qm = queueMicrotask\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
  });

  it("fires for const es = EventSource", () => {
    const src = "?bs 0.8\nconst es = EventSource\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("EventSource");
  });

  it("fires for const w = Worker", () => {
    const src = "?bs 0.8\nconst w = Worker\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("Worker");
  });

  it("fires for const sw = SharedWorker", () => {
    const src = "?bs 0.8\nconst sw = SharedWorker\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
  });

  it("fires for const bc = BroadcastChannel", () => {
    const src = "?bs 0.8\nconst bc = BroadcastChannel\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
  });

  it("fires for const n = Notification", () => {
    const src = "?bs 0.8\nconst n = Notification\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("Notification");
  });
});

// ---------------------------------------------------------------------------
// ALI004 fires for member-access namespace globals
// ---------------------------------------------------------------------------

describe("ALI004: fires for member-access namespace globals", () => {
  it("fires for const m = Math", () => {
    const src = "?bs 0.8\nconst m = Math\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("Math");
  });

  it("fires for const c = crypto", () => {
    const src = "?bs 0.8\nconst c = crypto\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("crypto");
  });

  it("fires for const con = console", () => {
    const src = "?bs 0.8\nconst con = console\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("console");
  });

  it("fires for const proc = process", () => {
    const src = "?bs 0.8\nconst proc = process\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("process");
  });

  it("fires for const nav = navigator", () => {
    const src = "?bs 0.8\nconst nav = navigator\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("navigator");
  });

  it("fires for const idb = indexedDB", () => {
    const src = "?bs 0.8\nconst idb = indexedDB\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("indexedDB");
  });
});

// ---------------------------------------------------------------------------
// ALI004 message and severity
// ---------------------------------------------------------------------------

describe("ALI004: message content and severity", () => {
  it("warning is non-blocking — compilation succeeds", () => {
    const src = "?bs 0.8\nconst f = fetch\n";
    expect(() => transform(src)).not.toThrow();
  });

  it("message names the alias and the global", () => {
    const src = "?bs 0.8\nconst myFetch = fetch\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("myFetch");
    expect(warns[0]!.message).toContain("fetch");
    expect(warns[0]!.message).toContain("SYN");
  });

  it("message mentions bypass", () => {
    const src = "?bs 0.8\nconst f = fetch\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns[0]!.message).toContain("bypass");
  });
});

// ---------------------------------------------------------------------------
// ALI004 does NOT fire below ?bs 0.8
// ---------------------------------------------------------------------------

describe("ALI004: gated on ?bs 0.8", () => {
  it("does not fire at ?bs 0.7", () => {
    const src = "?bs 0.7\nconst f = fetch\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(0);
  });

  it("fires at ?bs 0.8", () => {
    const src = "?bs 0.8\nconst f = fetch\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
  });

  it("fires at ?bs 0.9", () => {
    const src = "?bs 0.9\nconst f = fetch\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ALI004 does NOT fire for non-trivial RHS or non-global idents
// ---------------------------------------------------------------------------

describe("ALI004: does not fire for non-global idents or non-trivial RHS", () => {
  it("does not fire for const f = myFunction (non-global ident)", () => {
    const src = "?bs 0.8\nconst f = myFunction\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(0);
  });

  it("does not fire for const f = fetch.bind(null) (non-trivial RHS)", () => {
    const src = "?bs 0.8\nconst f = fetch.bind\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(0);
  });

  it("does not fire for member call like fetch.bind(null) with continuation", () => {
    const src = "?bs 0.8\nconst f = fetch + null\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(0);
  });

  it("does not fire when alias name is itself a SYN global (trivial self-reference)", () => {
    // `const fetch = fetch` is a self-reference; the alias name IS the global.
    const src = "?bs 0.8\nconst fetch = fetch\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(0);
  });

  it("does not fire inside fn bodies (only module-scope bindings)", () => {
    const src = "?bs 0.8\nfn foo() uses {} -> void {\n  const f = fetch\n}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(0);
  });

  it("does not fire for stdlib namespace names (not SYN globals)", () => {
    const src = "?bs 0.8\nconst t = time\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple globals: each fires independently
// ---------------------------------------------------------------------------

describe("ALI004: multiple globals in same module", () => {
  it("fires once per aliased global", () => {
    const src = "?bs 0.8\nconst f = fetch\nconst ws = WebSocket\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(2);
    const globals = warns.map((w) => w.message).join(" ");
    expect(globals).toContain("fetch");
    expect(globals).toContain("WebSocket");
  });
});

// ---------------------------------------------------------------------------
// Type-annotated bindings
// ---------------------------------------------------------------------------

describe("ALI004: type-annotated bindings", () => {
  it("fires for const f: typeof fetch = fetch", () => {
    const src = "?bs 0.8\nconst f: typeof fetch = fetch\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI004");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("fetch");
  });
});
