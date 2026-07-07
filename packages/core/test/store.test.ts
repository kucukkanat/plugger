import { describe, expect, it, vi } from "vitest";
import { createStore, strictEqual } from "../src/store.js";

interface State {
  count: number;
  user: string;
  nested: { a: number };
}

const initial = (): State => ({ count: 0, user: "ada", nested: { a: 1 } });

describe("createStore", () => {
  it("returns a copy of the initial state, not the original reference", () => {
    const init = initial();
    const store = createStore(init);
    expect(store.getState()).toEqual(init);
    expect(store.getState()).not.toBe(init);
  });

  it("shallow-merges patches and produces a new reference", () => {
    const store = createStore(initial());
    const before = store.getState();
    store.setState({ count: 5 });
    expect(store.getState().count).toBe(5);
    expect(store.getState().user).toBe("ada");
    expect(store.getState()).not.toBe(before);
  });

  it("supports functional patches", () => {
    const store = createStore(initial());
    store.setState((s) => ({ count: s.count + 1 }));
    store.setState((s) => ({ count: s.count + 1 }));
    expect(store.getState().count).toBe(2);
  });

  it("notifies subscribers with next and previous state", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    const [next, prev] = listener.mock.calls[0]!;
    expect(next.count).toBe(1);
    expect(prev.count).toBe(0);
  });

  it("does not notify when a patch changes nothing", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ count: 0 }); // same value
    store.setState({}); // empty
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores null/undefined patches from functional updaters", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState(() => null as unknown as Partial<State>);
    expect(listener).not.toHaveBeenCalled();
  });

  it("unsubscribe stops notifications", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.setState({ count: 1 });
    off();
    store.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tracks subscriber count via size", () => {
    const store = createStore(initial());
    expect(store.size).toBe(0);
    const a = store.subscribe(() => {});
    const b = store.subscribe(() => {});
    expect(store.size).toBe(2);
    a();
    expect(store.size).toBe(1);
    b();
    expect(store.size).toBe(0);
  });

  it("is safe to unsubscribe during notification", () => {
    const store = createStore(initial());
    const calls: string[] = [];
    const offA = store.subscribe(() => {
      calls.push("a");
      offA();
    });
    store.subscribe(() => calls.push("b"));
    store.setState({ count: 1 });
    store.setState({ count: 2 });
    expect(calls).toEqual(["a", "b", "b"]);
  });

  describe("select", () => {
    it("fires only when the selected slice changes", () => {
      const store = createStore(initial());
      const listener = vi.fn();
      store.select((s) => s.count, listener);
      store.setState({ user: "grace" }); // unrelated
      expect(listener).not.toHaveBeenCalled();
      store.setState({ count: 3 });
      expect(listener).toHaveBeenCalledWith(3, 0);
    });

    it("supports immediate emission", () => {
      const store = createStore(initial());
      const listener = vi.fn();
      store.select((s) => s.count, listener, { immediate: true });
      expect(listener).toHaveBeenCalledWith(0, 0);
    });

    it("supports a custom equality function", () => {
      const store = createStore(initial());
      const listener = vi.fn();
      store.select((s) => s.nested, listener, {
        equals: (a, b) => a.a === b.a,
      });
      store.setState({ nested: { a: 1 } }); // deep-equal → no fire
      expect(listener).not.toHaveBeenCalled();
      store.setState({ nested: { a: 2 } });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  it("strictEqual matches Object.is semantics", () => {
    expect(strictEqual(NaN, NaN)).toBe(true);
    expect(strictEqual(0, -0)).toBe(false);
    expect(strictEqual("x", "x")).toBe(true);
  });
});
