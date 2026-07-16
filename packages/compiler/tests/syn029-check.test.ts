/**
 * Tests for SYN029: RTCPeerConnection() construction detection (?bs 0.7+).
 *
 * SYN029 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN029: RTCPeerConnection() construction detection", () => {
  it("fires on new RTCPeerConnection(config) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  return new RTCPeerConnection(config)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires on bare RTCPeerConnection(config) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  return RTCPeerConnection(config)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires on new RTCPeerConnection() with no arguments", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer() -> RTCPeerConnection {\n" +
      "  return new RTCPeerConnection()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires on TypeScript instantiation form new RTCPeerConnection<T>()", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  return new RTCPeerConnection<RTCConfiguration>(config)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires on RTCPeerConnection?.() optional call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer(config: RTCConfiguration) -> any {\n" +
      "  return RTCPeerConnection?.(config)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("produces a warning-severity diagnostic", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  return new RTCPeerConnection(config)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN029");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  return new RTCPeerConnection(config)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      '  unsafe "creates RTCPeerConnection for thin adapter" { return new RTCPeerConnection(config) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "thin WebRTC adapter" fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n' +
      "  return new RTCPeerConnection(config)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire on obj.RTCPeerConnection(...) — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer(adapter: any, config: RTCConfiguration) -> any {\n" +
      "  return adapter.RTCPeerConnection(config)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire on bare RTCPeerConnection reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getConstructor() -> any {\n" +
      "  return RTCPeerConnection\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire on fn RTCPeerConnection(...) botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn RTCPeerConnection(config: RTCConfiguration) -> any {\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire on JS function RTCPeerConnection() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(config: RTCConfiguration) -> any {\n" +
      "  function RTCPeerConnection(cfg: RTCConfiguration) { return }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire on object method shorthands named RTCPeerConnection", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeAdapter(config: RTCConfiguration) -> any {\n" +
      "  return { RTCPeerConnection(cfg: RTCConfiguration) { return null } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire on TS type-literal method signature — { RTCPeerConnection(cfg: T): T }", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  type T = { RTCPeerConnection(cfg: RTCConfiguration): RTCPeerConnection }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("fires in ternary consequent — not suppressed by trailing ':'", () => {
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean, a: RTCConfiguration, b: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  return cond ? new RTCPeerConnection(a) : new RTCPeerConnection(b)\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN029");
    expect(codes.length).toBe(2);
  });

  it("fires on function* RTCPeerConnection() generator with excluded declaration name", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  function* RTCPeerConnection() { yield null }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("diagnostic includes 'RTCPeerConnection' in the message", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  return new RTCPeerConnection(config)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN029");
    expect(w?.message).toMatch(/RTCPeerConnection/);
  });
});
