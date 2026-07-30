/**
 * Tests for SYN031 — new MessageChannel() creates a paired async message channel
 * whose delivery effects are invisible to the fn header (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN031 — MessageChannel async channel (?bs 0.7+)", () => {
  it("fires SYN031 on new MessageChannel()", () => {
    const src =
      "?bs 0.7\n" +
      "fn bridge(worker: Worker) -> void {\n" +
      "  const channel = new MessageChannel()\n" +
      "  channel.port1.onmessage = (e) => { storage.set('last', e.data) }\n" +
      "  worker.postMessage('init', [channel.port2])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires SYN031 on bare MessageChannel() without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn setup() -> void {\n" +
      "  const { port1, port2 } = MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires SYN031 on MessageChannel?.() optional call", () => {
    const src =
      "?bs 0.7\n" +
      "fn setup() -> void {\n" +
      "  const ch = MessageChannel?.()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires SYN031 on new MessageChannel<T>() generic form", () => {
    const src =
      "?bs 0.7\n" +
      "fn typed() -> void {\n" +
      "  const ch = new MessageChannel<string>()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("SYN031 message contains fn name and 'MessageChannel'", () => {
    const src =
      "?bs 0.7\n" +
      "fn myBridge(worker: Worker) -> void {\n" +
      "  const ch = new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN031");
    expect(w).toBeDefined();
    expect(w!.message).toContain("myBridge");
    expect(w!.message).toContain("MessageChannel");
  });

  it("SYN031 message mentions async delivery or port.postMessage", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN031");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/async|postMessage|MessagePort/i);
  });

  it("does NOT fire SYN031 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(worker: Worker) -> void {\n" +
      "  const ch = unsafe \"creates message channel for worker bridge\" {\n" +
      "    new MessageChannel()\n" +
      "  }\n" +
      "  worker.postMessage('init', [ch.port2])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire SYN031 on obj.MessageChannel (member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(env: any) -> void {\n" +
      "  const ch = env.MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire SYN031 on the function declaration named MessageChannel itself", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  function MessageChannel() { return { port1: {}, port2: {} } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire SYN031 for ?bs < 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn f() -> void {\n" +
      "  const ch = new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire SYN031 on method shorthand: { MessageChannel() { } }", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  const obj = { MessageChannel() { return { port1: {}, port2: {} } } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire SYN031 on TS method signature: { MessageChannel(): T; }", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  type R = { MessageChannel(): { port1: MessagePort; port2: MessagePort }; }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("fires on both new form and bare call in same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  const a = new MessageChannel()\n" +
      "  const b = MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    const syn031s = result.warnings.filter((w) => w.code === "SYN031");
    expect(syn031s.length).toBeGreaterThanOrEqual(2);
  });

  it("reports line number pointing at the MessageChannel call", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  const ch = new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN031");
    expect(w).toBeDefined();
    expect(w!.line).toBe(3);
  });

  it("does NOT fire SYN031 on fn keyword declaration named MessageChannel", () => {
    const src =
      "?bs 0.7\n" +
      "fn MessageChannel() -> void {\n" +
      "  const x = 1\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });
});
