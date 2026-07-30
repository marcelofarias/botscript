/**
 * Tests for SYN023: navigator.* ambient browser capability access in fn bodies (?bs 0.7+).
 *
 * Covers: navigator.geolocation, navigator.clipboard, navigator.mediaDevices,
 * navigator.serviceWorker, navigator.permissions, navigator.onLine,
 * navigator.userAgent, navigator.language, navigator.languages, navigator.platform,
 * navigator.hardwareConcurrency, navigator.deviceMemory, navigator.connection,
 * navigator.wakeLock.
 *
 * SYN023 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN023: navigator.* ambient browser capability detection", () => {
  it("fires on navigator.geolocation", () => {
    const src =
      "?bs 0.7\n" +
      "fn getLocation() -> any {\n" +
      "  return navigator.geolocation\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.clipboard", () => {
    const src =
      "?bs 0.7\n" +
      "fn getClip() -> any {\n" +
      "  return navigator.clipboard\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.mediaDevices", () => {
    const src =
      "?bs 0.7\n" +
      "fn getMedia() -> any {\n" +
      "  return navigator.mediaDevices\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.serviceWorker", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSW() -> any {\n" +
      "  return navigator.serviceWorker\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.permissions", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPerms() -> any {\n" +
      "  return navigator.permissions\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.onLine", () => {
    const src =
      "?bs 0.7\n" +
      "fn isConnected() -> boolean {\n" +
      "  return navigator.onLine\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.userAgent", () => {
    const src =
      "?bs 0.7\n" +
      "fn getBrowser() -> string {\n" +
      "  return navigator.userAgent\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.language", () => {
    const src =
      "?bs 0.7\n" +
      "fn getLang() -> string {\n" +
      "  return navigator.language\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.languages", () => {
    const src =
      "?bs 0.7\n" +
      "fn getLangs() -> string[] {\n" +
      "  return navigator.languages\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.platform", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPlatform() -> string {\n" +
      "  return navigator.platform\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.hardwareConcurrency", () => {
    const src =
      "?bs 0.7\n" +
      "fn getCores() -> number {\n" +
      "  return navigator.hardwareConcurrency\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.deviceMemory", () => {
    const src =
      "?bs 0.7\n" +
      "fn getMemory() -> number {\n" +
      "  return navigator.deviceMemory\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.connection", () => {
    const src =
      "?bs 0.7\n" +
      "fn getNetwork() -> any {\n" +
      "  return navigator.connection\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on navigator.wakeLock", () => {
    const src =
      "?bs 0.7\n" +
      "fn getWakeLock() -> any {\n" +
      "  return navigator.wakeLock\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("fires on optional-chain navigator?.onLine", () => {
    const src =
      "?bs 0.7\n" +
      "fn isConnected() -> boolean {\n" +
      "  return navigator?.onLine\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("produces a warning-severity diagnostic (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getBrowser() -> string {\n" +
      "  return navigator.userAgent\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN023");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("warning message mentions the fn name and the accessed member", () => {
    const src =
      "?bs 0.7\n" +
      "fn detectOS() -> string {\n" +
      "  return navigator.platform\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN023")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("detectOS");
    expect(w.message).toContain("navigator.platform");
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getBrowser() -> string {\n" +
      "  return navigator.userAgent\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn getBrowser() -> string {\n" +
      '  return unsafe "accesses navigator.userAgent for browser detection" { navigator.userAgent }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "accesses navigator for browser info" fn getBrowser() -> string {\n' +
      "  return navigator.userAgent\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(false);
  });

  it("does NOT fire on obj.navigator.userAgent — navigator is not the global", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(ctx: { navigator: { userAgent: string } }) -> string {\n" +
      "  return ctx.navigator.userAgent\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(false);
  });

  it("does NOT fire on bare navigator reference (no member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getNav() -> any {\n" +
      "  return navigator\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(false);
  });

  it("fires on navigator.sendBeacon — fire-and-forget network request bypasses capability model", () => {
    const src =
      "?bs 0.7\n" +
      "fn beacon(url: string) -> void {\n" +
      "  navigator.sendBeacon(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("does NOT fire on fn navigator(...) declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn navigator(ua: string) -> string {\n" +
      "  return ua\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN023")).toBe(false);
  });

  it("optional-chain message includes ?. separator", () => {
    const src =
      "?bs 0.7\n" +
      "fn isConnected() -> boolean {\n" +
      "  return navigator?.onLine\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN023")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("navigator?.onLine");
  });
});
