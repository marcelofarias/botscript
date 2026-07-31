/**
 * Tests for SYN032 — new RTCPeerConnection() opens a WebRTC peer-to-peer session whose
 * UDP-based network channel and async event handler effects are invisible to the capability
 * model (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN032 — RTCPeerConnection peer-to-peer network bypass (?bs 0.7+)", () => {
  it("fires SYN032 on new RTCPeerConnection(config)", () => {
    const src =
      "?bs 0.7\n" +
      "fn initPeer(config: RTCConfiguration) -> void {\n" +
      "  const pc = new RTCPeerConnection(config)\n" +
      "  pc.onicecandidate = (e) => { void e.candidate }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires SYN032 on bare RTCPeerConnection(config) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn setup() -> void {\n" +
      "  const pc = RTCPeerConnection({ iceServers: [] })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires SYN032 on RTCPeerConnection?.() optional call", () => {
    const src =
      "?bs 0.7\n" +
      "fn setup() -> void {\n" +
      "  const pc = RTCPeerConnection?.({ iceServers: [] })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires SYN032 on new RTCPeerConnection<T>() generic form", () => {
    const src =
      "?bs 0.7\n" +
      "fn typed() -> void {\n" +
      "  const pc = new RTCPeerConnection<RTCConfiguration>({})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("SYN032 message contains fn name and 'RTCPeerConnection'", () => {
    const src =
      "?bs 0.7\n" +
      "fn connectPeer() -> void {\n" +
      "  const pc = new RTCPeerConnection({})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN032");
    expect(w).toBeDefined();
    expect(w!.message).toContain("connectPeer");
    expect(w!.message).toContain("RTCPeerConnection");
  });

  it("SYN032 message mentions UDP, WebRTC, or ICE", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  new RTCPeerConnection({})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN032");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/UDP|WebRTC|ICE|RTCDataChannel|peer.?to.?peer/i);
  });

  it("does NOT fire SYN032 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(config: RTCConfiguration) -> void {\n" +
      "  const pc = unsafe \"opens WebRTC peer connection for p2p media relay\" {\n" +
      "    new RTCPeerConnection(config)\n" +
      "  }\n" +
      "  pc.onicecandidate = (e) => { void e.candidate }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on obj.RTCPeerConnection (member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(env: any) -> void {\n" +
      "  const pc = env.RTCPeerConnection({})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on the function declaration named RTCPeerConnection itself", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  function RTCPeerConnection(config: any) { return { close: () => {} } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 for ?bs < 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn f() -> void {\n" +
      "  const pc = new RTCPeerConnection({})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on method shorthand: { RTCPeerConnection() { } }", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  const obj = { RTCPeerConnection(config: any) { return { close: () => {} } } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on TS method signature: { RTCPeerConnection(): T; }", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  type R = { RTCPeerConnection(config: RTCConfiguration): RTCPeerConnection; }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("fires on both new form and bare call in same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  const a = new RTCPeerConnection({})\n" +
      "  const b = RTCPeerConnection({})\n" +
      "}\n";
    const result = compile(src);
    const syn032s = result.warnings.filter((w) => w.code === "SYN032");
    expect(syn032s.length).toBeGreaterThanOrEqual(2);
  });

  it("reports line number pointing at the RTCPeerConnection call", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  const pc = new RTCPeerConnection({})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN032");
    expect(w).toBeDefined();
    expect(w!.line).toBe(3);
  });

  it("does NOT fire SYN032 on fn keyword declaration named RTCPeerConnection", () => {
    const src =
      "?bs 0.7\n" +
      "fn RTCPeerConnection(config: any) -> void {\n" +
      "  const x = 1\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });
});
