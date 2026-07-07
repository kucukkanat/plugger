import { describe, expect, it, vi } from "vitest";
import { createPluginHost, PluginHost } from "../src/host.js";
import { PermissionError } from "../src/permissions.js";
import { createMemoryStorage } from "../src/storage.js";
import { definePlugin } from "../src/plugin.js";
import type { ModuleImporter, PluginModule } from "../src/types.js";

interface State {
  count: number;
  theme: "light" | "dark";
}
interface Api {
  greet(name: string): string;
  danger(): void;
}

function makeHost(overrides = {}) {
  const api: Api = {
    greet: (name) => `hi ${name}`,
    danger: vi.fn(),
  };
  return createPluginHost<Api, State>({
    state: { count: 0, theme: "light" },
    api,
    slots: ["sidebar"],
    storage: createMemoryStorage(),
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    ...overrides,
  });
}

describe("PluginHost — loading & registration", () => {
  it("loads an in-memory plugin via use() and auto-activates it", async () => {
    const host = makeHost();
    const activate = vi.fn();
    await host.use(definePlugin<Api, State>({ name: "p", activate }));
    expect(activate).toHaveBeenCalledOnce();
    expect(host.status("p")).toBe("active");
    expect(host.has("p")).toBe(true);
    expect(host.list()).toHaveLength(1);
  });

  it("respects autoActivate: false", async () => {
    const host = makeHost({ autoActivate: false });
    const activate = vi.fn();
    await host.use(definePlugin({ name: "p", activate }));
    expect(activate).not.toHaveBeenCalled();
    expect(host.status("p")).toBe("loaded");
    await host.activate("p");
    expect(activate).toHaveBeenCalledOnce();
  });

  it("loads from a URL source through the injected importer", async () => {
    const importer: ModuleImporter = async (): Promise<PluginModule> => ({
      default: definePlugin({ name: "remote" }),
    });
    const host = makeHost({ importer });
    await host.load("https://cdn.test/p.mjs");
    expect(host.has("remote")).toBe(true);
  });

  it("rejects a duplicate plugin name", async () => {
    const host = makeHost();
    await host.use(definePlugin({ name: "dup" }));
    await expect(host.use(definePlugin({ name: "dup" }))).rejects.toThrow(/already registered/);
  });

  it("emits plugin:loaded and plugin:activated host events", async () => {
    const host = makeHost();
    const loaded = vi.fn();
    const activated = vi.fn();
    host.on("plugin:loaded", loaded);
    host.on("plugin:activated", activated);
    await host.use(definePlugin({ name: "p" }));
    expect(loaded).toHaveBeenCalledWith({ name: "p" });
    expect(activated).toHaveBeenCalledWith({ name: "p" });
  });
});

describe("PluginHost — optional state", () => {
  it("runs an imperative-only host with no state configured", async () => {
    const toast = vi.fn();
    const host = createPluginHost<{ toast(msg: string): void }>({
      api: { toast },
      slots: ["toolbar"],
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    });

    // No `state` option and no `S` generic — the store is simply empty.
    expect(host.store.getState()).toEqual({});

    await host.use(
      definePlugin<{ toast(msg: string): void }>({
        name: "imperative",
        permissions: ["ui:render", "api:toast"],
        activate(ctx) {
          ctx.api.toast("ready");
          ctx.ui.contribute("toolbar", {
            mount: (el) => {
              el.textContent = "hi";
            },
          });
        },
      }),
    );

    expect(host.status("imperative")).toBe("active");
    expect(toast).toHaveBeenCalledWith("ready");
    expect(host.getSlot("toolbar")).toHaveLength(1);
  });

  it("still allows read/write against the initially-empty store", async () => {
    const host = createPluginHost({
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    });
    await host.use(
      definePlugin({
        name: "late-state",
        permissions: ["state:read", "state:write"],
        activate(ctx) {
          expect(ctx.store.getState()).toEqual({});
          ctx.store.setState({ hello: "world" });
        },
      }),
    );
    expect(host.store.getState()).toEqual({ hello: "world" });
  });
});

describe("PluginHost — store access & permissions", () => {
  it("grants read/write when the plugin requests them", async () => {
    const host = makeHost();
    await host.use(
      definePlugin<Api, State>({
        name: "counter",
        permissions: ["state:read", "state:write"],
        activate(ctx) {
          expect(ctx.store.getState().count).toBe(0);
          ctx.store.setState({ count: 10 });
        },
      }),
    );
    expect(host.store.getState().count).toBe(10);
  });

  it("throws PermissionError on unpermitted state write", async () => {
    const host = makeHost();
    await expect(
      host.use(
        definePlugin<Api, State>({
          name: "sneaky",
          permissions: ["state:read"],
          activate(ctx) {
            ctx.store.setState({ count: 1 });
          },
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
    expect(host.status("sneaky")).toBe("error");
  });

  it("throws PermissionError on unpermitted state read", async () => {
    const host = makeHost();
    await expect(
      host.use(
        definePlugin<Api, State>({
          name: "peeker",
          activate(ctx) {
            ctx.store.getState();
          },
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("plugin store subscriptions are torn down on deactivate", async () => {
    const host = makeHost();
    const onChange = vi.fn();
    await host.use(
      definePlugin<Api, State>({
        name: "watcher",
        permissions: ["state:read"],
        activate(ctx) {
          ctx.store.subscribe(onChange);
        },
      }),
    );
    host.store.setState({ count: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    await host.deactivate("watcher");
    host.store.setState({ count: 2 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(host.store.size).toBe(0);
  });
});

describe("PluginHost — API proxy", () => {
  it("permits accessing an api method with api:<name>", async () => {
    const host = makeHost();
    let result = "";
    await host.use(
      definePlugin<Api, State>({
        name: "greeter",
        permissions: ["api:greet"],
        activate(ctx) {
          result = ctx.api.greet("ada");
        },
      }),
    );
    expect(result).toBe("hi ada");
  });

  it("blocks api methods that were not granted", async () => {
    const host = makeHost();
    await expect(
      host.use(
        definePlugin<Api, State>({
          name: "abuser",
          permissions: ["api:greet"],
          activate(ctx) {
            ctx.api.danger();
          },
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("api:* wildcard grants access to every method", async () => {
    const host = makeHost();
    await host.use(
      definePlugin<Api, State>({
        name: "trusted",
        permissions: ["api:*" as `api:${string}`],
        activate(ctx) {
          ctx.api.greet("x");
          ctx.api.danger();
        },
      }),
    );
    expect(host.status("trusted")).toBe("active");
  });
});

describe("PluginHost — commands", () => {
  it("registers and executes commands with permission", async () => {
    const host = makeHost();
    await host.use(
      definePlugin<Api, State>({
        name: "cmd",
        permissions: ["commands:register"],
        activate(ctx) {
          ctx.commands.register({ id: "cmd.hello", run: () => "world" });
        },
      }),
    );
    expect(host.commands.has("cmd.hello")).toBe(true);
    expect(host.commands.execute("cmd.hello")).toBe("world");
  });

  it("removes commands when the plugin deactivates", async () => {
    const host = makeHost();
    await host.use(
      definePlugin<Api, State>({
        name: "cmd",
        permissions: ["commands:register"],
        activate(ctx) {
          ctx.commands.register({ id: "cmd.x", run: () => 1 });
        },
      }),
    );
    await host.deactivate("cmd");
    expect(host.commands.has("cmd.x")).toBe(false);
  });

  it("blocks command registration without permission", async () => {
    const host = makeHost();
    await expect(
      host.use(
        definePlugin<Api, State>({
          name: "cmd",
          activate(ctx) {
            ctx.commands.register({ id: "y", run: () => 1 });
          },
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("PluginHost — UI contributions", () => {
  it("contributes to a slot and fires slot-change listeners", async () => {
    const host = makeHost();
    const onSlot = vi.fn();
    host.onSlotChange(onSlot, "sidebar");
    await host.use(
      definePlugin<Api, State>({
        name: "ui",
        permissions: ["ui:render"],
        activate(ctx) {
          ctx.ui.contribute("sidebar", { id: "widget", mount: () => {} });
        },
      }),
    );
    expect(host.getSlot("sidebar").map((c) => c.id)).toEqual(["widget"]);
    expect(onSlot).toHaveBeenCalledWith("sidebar");
  });

  it("removes contributions when the plugin deactivates", async () => {
    const host = makeHost();
    await host.use(
      definePlugin<Api, State>({
        name: "ui",
        permissions: ["ui:render"],
        activate(ctx) {
          ctx.ui.contribute("sidebar", { mount: () => {} });
        },
      }),
    );
    expect(host.getSlot("sidebar")).toHaveLength(1);
    await host.deactivate("ui");
    expect(host.getSlot("sidebar")).toHaveLength(0);
  });

  it("blocks UI contribution without permission", async () => {
    const host = makeHost();
    await expect(
      host.use(
        definePlugin<Api, State>({
          name: "ui",
          activate(ctx) {
            ctx.ui.contribute("sidebar", { mount: () => {} });
          },
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("PluginHost — events & storage", () => {
  it("scopes plugin events under their namespace", async () => {
    const host = makeHost();
    const seen = vi.fn();
    host.on("plugin:emitter:hello", seen);
    await host.use(
      definePlugin<Api, State>({
        name: "emitter",
        permissions: ["events:emit"],
        activate(ctx) {
          ctx.events.emit("hello", 123);
        },
      }),
    );
    expect(seen).toHaveBeenCalledWith(123);
  });

  it("persists and isolates plugin storage", async () => {
    const host = makeHost();
    await host.use(
      definePlugin<Api, State>({
        name: "saver",
        permissions: ["storage"],
        activate(ctx) {
          ctx.storage.set("k", { hello: true });
          expect(ctx.storage.get("k")).toEqual({ hello: true });
        },
      }),
    );
  });

  it("blocks storage without permission", async () => {
    const host = makeHost();
    await expect(
      host.use(
        definePlugin<Api, State>({
          name: "saver",
          activate(ctx) {
            ctx.storage.set("k", 1);
          },
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("PluginHost — lifecycle & errors", () => {
  it("marks a plugin as errored and cleans up when activate throws", async () => {
    const host = makeHost();
    const onError = vi.fn();
    host.on("plugin:error", onError);
    await expect(
      host.use(
        definePlugin<Api, State>({
          name: "boom",
          permissions: ["ui:render"],
          activate(ctx) {
            ctx.ui.contribute("sidebar", { mount: () => {} });
            throw new Error("kaboom");
          },
        }),
      ),
    ).rejects.toThrow("kaboom");
    expect(host.status("boom")).toBe("error");
    expect(host.getSlot("sidebar")).toHaveLength(0); // rolled back
    expect(onError).toHaveBeenCalled();
  });

  it("runs deactivate hooks and disposes tracked subscriptions", async () => {
    const host = makeHost();
    const cleanup = vi.fn();
    const deactivate = vi.fn();
    await host.use(
      definePlugin<Api, State>({
        name: "life",
        permissions: ["state:read"],
        activate(ctx) {
          ctx.subscribe(cleanup);
        },
        deactivate,
      }),
    );
    await host.deactivate("life");
    expect(deactivate).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(host.status("life")).toBe("inactive");
  });

  it("activates declared dependencies first", async () => {
    const host = makeHost();
    const order: string[] = [];
    await host.use(
      definePlugin({ name: "base", activate: () => void order.push("base") }),
      { activate: false },
    );
    await host.use(
      definePlugin({
        name: "feature",
        dependencies: ["base"],
        activate: () => void order.push("feature"),
      }),
      { activate: false },
    );
    await host.activate("feature");
    expect(order).toEqual(["base", "feature"]);
  });

  it("throws if a dependency is not loaded", async () => {
    const host = makeHost();
    await expect(
      host.use(definePlugin({ name: "needy", dependencies: ["ghost"] })),
    ).rejects.toThrow(/depends on "ghost"/);
  });

  it("remove() deactivates and unregisters", async () => {
    const host = makeHost();
    const removed = vi.fn();
    host.on("plugin:removed", removed);
    await host.use(definePlugin({ name: "temp" }));
    await host.remove("temp");
    expect(host.has("temp")).toBe(false);
    expect(removed).toHaveBeenCalledWith({ name: "temp" });
  });

  it("destroy() removes every plugin", async () => {
    const host = makeHost();
    await host.use(definePlugin({ name: "a" }));
    await host.use(definePlugin({ name: "b" }));
    await host.destroy();
    expect(host.list()).toHaveLength(0);
  });

  it("hasPermission reflects the granted set", async () => {
    const host = makeHost();
    await host.use(
      definePlugin<Api, State>({
        name: "perm",
        permissions: ["state:read"],
        activate(ctx) {
          expect(ctx.hasPermission("state:read")).toBe(true);
          expect(ctx.hasPermission("state:write")).toBe(false);
        },
      }),
    );
    expect(host.permissionsOf("perm")).toContain("state:read");
  });
});

describe("PluginHost — permission policy integration", () => {
  it("applies default policy grants to plugins that do not request them", async () => {
    const host = makeHost({ permissions: { default: ["state:read"] } });
    let value = -1;
    await host.use(
      definePlugin<Api, State>({
        name: "reader",
        activate(ctx) {
          value = ctx.store.getState().count;
        },
      }),
    );
    expect(value).toBe(0);
  });

  it("honours an interactive onRequest consent callback", async () => {
    const onRequest = vi.fn(async (p: string) => p === "state:read");
    const host = makeHost({ permissions: { onRequest } });
    await expect(
      host.use(
        definePlugin<Api, State>({
          name: "asker",
          permissions: ["state:write"],
          activate(ctx) {
            ctx.store.setState({ count: 1 });
          },
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
    expect(onRequest).toHaveBeenCalledWith("state:write", "asker");
  });
});

describe("PluginHost — construction", () => {
  it("is available both as a class and a factory", () => {
    const a = new PluginHost();
    const b = createPluginHost();
    expect(a).toBeInstanceOf(PluginHost);
    expect(b).toBeInstanceOf(PluginHost);
  });

  it("accepts a pre-built store", () => {
    const host = makeHost();
    expect(host.store.getState().theme).toBe("light");
  });
});
