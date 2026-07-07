import { describe, expect, it, vi } from "vitest";
import { createEventBus, namespacedBus } from "../src/events.js";

describe("createEventBus", () => {
  it("delivers emitted payloads to handlers", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on("ping", handler);
    bus.emit("ping", 42);
    expect(handler).toHaveBeenCalledWith(42);
  });

  it("supports multiple handlers per event", () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("e", a);
    bus.on("e", b);
    bus.emit("e");
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("off removes a handler", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on("e", handler);
    bus.off("e", handler);
    bus.emit("e");
    expect(handler).not.toHaveBeenCalled();
  });

  it("the unsubscribe returned by on removes the handler", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const off = bus.on("e", handler);
    off();
    bus.emit("e");
    expect(handler).not.toHaveBeenCalled();
  });

  it("once only fires a single time", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.once("e", handler);
    bus.emit("e", 1);
    bus.emit("e", 2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it("does not invoke handlers removed during emit", () => {
    const bus = createEventBus();
    const b = vi.fn();
    bus.on("e", () => bus.off("e", b));
    bus.on("e", b);
    bus.emit("e");
    expect(b).not.toHaveBeenCalled();
  });

  it("emitting an event with no handlers is a no-op", () => {
    const bus = createEventBus();
    expect(() => bus.emit("nothing")).not.toThrow();
  });
});

describe("namespacedBus", () => {
  it("prefixes event names on the underlying bus", () => {
    const base = createEventBus();
    const scoped = namespacedBus(base, "plugin:x");
    const rawListener = vi.fn();
    base.on("plugin:x:hello", rawListener);
    scoped.emit("hello", "hi");
    expect(rawListener).toHaveBeenCalledWith("hi");
  });

  it("isolates two namespaces from each other", () => {
    const base = createEventBus();
    const a = namespacedBus(base, "a");
    const b = namespacedBus(base, "b");
    const handler = vi.fn();
    b.on("evt", handler);
    a.emit("evt");
    expect(handler).not.toHaveBeenCalled();
    b.emit("evt");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("an event prefixed with @ escapes the namespace (global)", () => {
    const base = createEventBus();
    const scoped = namespacedBus(base, "a");
    const handler = vi.fn();
    base.on("global-event", handler);
    scoped.emit("@global-event", 1);
    expect(handler).toHaveBeenCalledWith(1);
  });
});
