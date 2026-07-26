/**
 * Tests for UNS006: setInterval inside unsafe block — perpetual side effect with
 * no visible cleanup (?bs 0.9+).
 *
 * SYN010 fires on setInterval OUTSIDE unsafe blocks and is suppressed inside them.
 * UNS006 closes the other side: it fires specifically INSIDE unsafe blocks because
 * setInterval is perpetual — the interval runs indefinitely past the enclosing
 * scope unless clearInterval is called.
 *
 * Does NOT fire on:
 *   - setInterval outside unsafe blocks (SYN010 handles that)
 *   - Property access: obj.setInterval(...)
 *   - fn/function declarations named setInterval
 *   - Method shorthands: { setInterval(fn) { ... } }
 *   - ?bs < 0.9 files
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// Basic firing cases
// ---------------------------------------------------------------------------

describe("UNS006: basic firing", () => {
  it("fires on setInterval inside a named unsafe block", () => {
    const src =
      "?bs 0.9\n" +
      "fn startPolling(url: string) uses { net } -> void {\n" +
      "  unsafe \"polling loop\" { setInterval(() => { http.get(url) }, 5000) }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
    expect(() => compile(src)).toThrow(/setInterval/);
  });

  it("fires on setInterval assigned in unsafe block", () => {
    const src =
      "?bs 0.9\n" +
      "fn startTick() -> void {\n" +
      "  const id = unsafe \"background ticker\" { setInterval(() => {}, 1000) }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });

  it("includes fn name in the message", () => {
    const src =
      "?bs 0.9\n" +
      "fn myPoller() -> void {\n" +
      "  unsafe \"scheduler\" { setInterval(() => {}, 100) }\n" +
      "}\n";
    expect(() => compile(src)).toThrow(/fn 'myPoller'/);
  });

  it("fires on optional-chain call setInterval?.(...) inside unsafe", () => {
    const src =
      "?bs 0.9\n" +
      "fn startOptional() -> void {\n" +
      "  unsafe \"polling\" { setInterval?.(() => {}, 500) }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Not fired outside unsafe blocks (SYN010 handles those)
// ---------------------------------------------------------------------------

describe("UNS006: not fired outside unsafe", () => {
  it("does NOT fire on bare setInterval outside unsafe (SYN010 warns instead)", () => {
    const src =
      "?bs 0.9\n" +
      "fn badPolling() -> void {\n" +
      "  setInterval(() => {}, 1000)\n" +
      "}\n";
    // SYN010 produces a warning (not an error throw); UNS006 must not fire.
    const result = transform(src);
    expect(result.warnings?.some((w: { code: string }) => w.code === "SYN010")).toBe(true);
    expect(() => compile(src)).not.toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Exclusions: property access
// ---------------------------------------------------------------------------

describe("UNS006: excludes property access forms", () => {
  it("does not fire on obj.setInterval(...) inside unsafe", () => {
    const src =
      "?bs 0.9\n" +
      "fn setup(timer: any) -> void {\n" +
      "  unsafe \"custom timer\" { timer.setInterval(() => {}, 1000) }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow("UNS006");
  });

  it("does not fire on obj?.setInterval(...) inside unsafe", () => {
    const src =
      "?bs 0.9\n" +
      "fn setup(timer: any) -> void {\n" +
      "  unsafe \"custom timer\" { timer?.setInterval(() => {}, 1000) }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Exclusions: declarations named setInterval
// ---------------------------------------------------------------------------

describe("UNS006: excludes declarations named setInterval", () => {
  it("does not fire on fn declaration named setInterval inside unsafe", () => {
    const src =
      "?bs 0.9\n" +
      "fn wrapper() -> void {\n" +
      "  unsafe \"custom\" {\n" +
      "    fn setInterval(cb: () -> void, ms: number) -> void { cb() }\n" +
      "    setInterval(() => {}, 1000)\n" +
      "  }\n" +
      "}\n";
    // The fn declaration itself is excluded; the subsequent call fires.
    expect(() => compile(src)).toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Version gating
// ---------------------------------------------------------------------------

describe("UNS006: version gating", () => {
  it("does not fire on ?bs 0.8 (check not enabled)", () => {
    const src =
      "?bs 0.8\n" +
      "fn startPolling() -> void {\n" +
      "  unsafe \"polling\" { setInterval(() => {}, 1000) }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow("UNS006");
  });

  it("fires on ?bs 0.9", () => {
    const src =
      "?bs 0.9\n" +
      "fn startPolling() -> void {\n" +
      "  unsafe \"polling\" { setInterval(() => {}, 1000) }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Unsafe fn bodies
// ---------------------------------------------------------------------------

describe("UNS006: fires inside unsafe fn bodies", () => {
  it("fires on setInterval inside an unsafe fn body", () => {
    const src =
      "?bs 0.9\n" +
      "unsafe \"low-level scheduler\" fn startTimer() -> void {\n" +
      "  setInterval(() => {}, 250)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Multiple calls
// ---------------------------------------------------------------------------

describe("UNS006: multiple violations", () => {
  it("fires on each setInterval call inside unsafe blocks", () => {
    const src =
      "?bs 0.9\n" +
      "fn multiTimer() -> void {\n" +
      "  unsafe \"first\" { setInterval(() => {}, 1000) }\n" +
      "  unsafe \"second\" { setInterval(() => {}, 5000) }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});
