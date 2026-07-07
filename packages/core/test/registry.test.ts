import { describe, expect, it, vi } from "vitest";
import { CommandError, CommandRegistry, UIRegistry } from "../src/registry.js";

describe("CommandRegistry", () => {
  it("registers and executes a command", () => {
    const reg = new CommandRegistry();
    reg.register({ id: "add", run: (a: number, b: number) => a + b }, "host");
    expect(reg.execute("add", 2, 3)).toBe(5);
    expect(reg.has("add")).toBe(true);
  });

  it("throws when registering a duplicate id", () => {
    const reg = new CommandRegistry();
    reg.register({ id: "x", run: () => 1 }, "a");
    expect(() => reg.register({ id: "x", run: () => 2 }, "b")).toThrow(CommandError);
  });

  it("throws when executing an unknown command", () => {
    const reg = new CommandRegistry();
    expect(() => reg.execute("missing")).toThrow(CommandError);
  });

  it("disposing a command removes it", () => {
    const reg = new CommandRegistry();
    const d = reg.register({ id: "x", run: () => 1 }, "a");
    d.dispose();
    expect(reg.has("x")).toBe(false);
  });

  it("removeOwner drops all commands for an owner", () => {
    const reg = new CommandRegistry();
    reg.register({ id: "a1", run: () => 0 }, "a");
    reg.register({ id: "a2", run: () => 0 }, "a");
    reg.register({ id: "b1", run: () => 0 }, "b");
    reg.removeOwner("a");
    expect(reg.list().map((c) => c.id)).toEqual(["b1"]);
  });

  it("notifies change listeners on register and remove", () => {
    const reg = new CommandRegistry();
    const listener = vi.fn();
    const off = reg.onChange(listener);
    const d = reg.register({ id: "x", run: () => 0 }, "a");
    d.dispose();
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    reg.register({ id: "y", run: () => 0 }, "a");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("UIRegistry", () => {
  it("declares slots and lists them", () => {
    const reg = new UIRegistry(["sidebar"]);
    expect(reg.slotNames()).toContain("sidebar");
    reg.declareSlot("toolbar");
    expect(reg.slotNames()).toEqual(expect.arrayContaining(["sidebar", "toolbar"]));
  });

  it("adds contributions in order", () => {
    const reg = new UIRegistry();
    reg.contribute("s", { mount: () => {}, order: 2, id: "b" }, "p");
    reg.contribute("s", { mount: () => {}, order: 1, id: "a" }, "p");
    expect(reg.get("s").map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("assigns a generated id when none is given", () => {
    const reg = new UIRegistry();
    reg.contribute("s", { mount: () => {} }, "p");
    expect(reg.get("s")[0]!.id).toMatch(/^p:s:\d+$/);
  });

  it("disposing removes only that contribution", () => {
    const reg = new UIRegistry();
    const d = reg.contribute("s", { mount: () => {}, id: "a" }, "p");
    reg.contribute("s", { mount: () => {}, id: "b" }, "p");
    d.dispose();
    expect(reg.get("s").map((c) => c.id)).toEqual(["b"]);
  });

  it("removeOwner drops contributions across slots", () => {
    const reg = new UIRegistry();
    reg.contribute("s1", { mount: () => {} }, "a");
    reg.contribute("s2", { mount: () => {} }, "a");
    reg.contribute("s1", { mount: () => {} }, "b");
    reg.removeOwner("a");
    expect(reg.get("s1").map((c) => c.owner)).toEqual(["b"]);
    expect(reg.get("s2")).toHaveLength(0);
  });

  it("notifies change listeners with the affected slot", () => {
    const reg = new UIRegistry();
    const listener = vi.fn();
    reg.onChange(listener);
    reg.contribute("sidebar", { mount: () => {} }, "p");
    expect(listener).toHaveBeenCalledWith("sidebar");
  });

  it("get returns a copy that cannot mutate internal state", () => {
    const reg = new UIRegistry();
    reg.contribute("s", { mount: () => {} }, "p");
    const list = reg.get("s");
    list.pop();
    expect(reg.get("s")).toHaveLength(1);
  });
});
