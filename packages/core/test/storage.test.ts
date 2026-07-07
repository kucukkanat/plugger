import { describe, expect, it } from "vitest";
import {
  createMemoryStorage,
  createPluginStorage,
  defaultStorage,
} from "../src/storage.js";

describe("createMemoryStorage", () => {
  it("acts as a Storage-like backend", () => {
    const s = createMemoryStorage();
    expect(s.getItem("a")).toBeNull();
    s.setItem("a", "1");
    expect(s.getItem("a")).toBe("1");
    expect(s.length).toBe(1);
    expect(s.key(0)).toBe("a");
    s.removeItem("a");
    expect(s.length).toBe(0);
  });
});

describe("createPluginStorage", () => {
  it("stores and reads back JSON values", () => {
    const store = createPluginStorage(createMemoryStorage(), "p");
    store.set("obj", { a: 1, b: [2, 3] });
    expect(store.get("obj")).toEqual({ a: 1, b: [2, 3] });
    expect(store.get<number>("missing")).toBeUndefined();
  });

  it("namespaces keys so plugins are isolated", () => {
    const backend = createMemoryStorage();
    const a = createPluginStorage(backend, "a");
    const b = createPluginStorage(backend, "b");
    a.set("token", "secretA");
    b.set("token", "secretB");
    expect(a.get("token")).toBe("secretA");
    expect(b.get("token")).toBe("secretB");
    expect(a.keys()).toEqual(["token"]);
  });

  it("keys lists only the plugin's own keys", () => {
    const backend = createMemoryStorage();
    backend.setItem("unrelated", "x");
    const store = createPluginStorage(backend, "p");
    store.set("k1", 1);
    store.set("k2", 2);
    expect(store.keys().sort()).toEqual(["k1", "k2"]);
  });

  it("remove and clear only affect the plugin's keys", () => {
    const backend = createMemoryStorage();
    const a = createPluginStorage(backend, "a");
    const b = createPluginStorage(backend, "b");
    a.set("x", 1);
    b.set("y", 2);
    a.clear();
    expect(a.keys()).toEqual([]);
    expect(b.get("y")).toBe(2);
  });

  it("returns undefined for corrupt JSON", () => {
    const backend = createMemoryStorage();
    backend.setItem("plugger:p:bad", "{not json");
    const store = createPluginStorage(backend, "p");
    expect(store.get("bad")).toBeUndefined();
  });
});

describe("defaultStorage", () => {
  it("returns a usable backend even without localStorage", () => {
    const s = defaultStorage();
    s.setItem("k", "v");
    expect(s.getItem("k")).toBe("v");
  });
});
