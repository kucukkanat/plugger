import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { createPluginHost, definePlugin, type PluginHost } from "@plugger/core";
import {
  PluggerProvider,
  PluggerSlot,
  useCommands,
  usePluginStore,
  usePlugins,
} from "../src/index.js";

interface State {
  count: number;
}

function makeHost() {
  return createPluginHost<Record<string, never>, State>({
    state: { count: 0 },
    slots: ["bar"],
  });
}

afterEach(cleanup);

describe("@plugger/react", () => {
  it("PluggerSlot renders plugin contributions", async () => {
    const host = makeHost();
    await host.use(
      definePlugin({
        name: "widget",
        permissions: ["ui:render"],
        activate(ctx) {
          ctx.ui.contribute("bar", { mount: (el) => (el.textContent = "Hello from plugin") });
        },
      }),
    );
    render(
      createElement(PluggerProvider, { host }, createElement(PluggerSlot, { name: "bar" })),
    );
    expect(await screen.findByText("Hello from plugin")).toBeTruthy();
  });

  it("PluggerSlot shows fallback when the slot is empty and updates live", async () => {
    const host = makeHost();
    render(
      createElement(
        PluggerProvider,
        { host },
        createElement(PluggerSlot, { name: "bar", fallback: "empty" }),
      ),
    );
    expect(screen.getByText("empty")).toBeTruthy();
    await act(async () => {
      await host.use(
        definePlugin({
          name: "late",
          permissions: ["ui:render"],
          activate(ctx) {
            ctx.ui.contribute("bar", { mount: (el) => (el.textContent = "arrived") });
          },
        }),
      );
    });
    expect(screen.getByText("arrived")).toBeTruthy();
  });

  it("usePluginStore re-renders on the selected slice", async () => {
    const host = makeHost();
    function Counter() {
      const count = usePluginStore<State, number>((s) => s.count);
      return createElement("span", { "data-testid": "c" }, String(count));
    }
    render(createElement(PluggerProvider, { host }, createElement(Counter)));
    expect(screen.getByTestId("c").textContent).toBe("0");
    await act(async () => {
      host.store.setState({ count: 5 });
    });
    expect(screen.getByTestId("c").textContent).toBe("5");
  });

  it("useCommands stays in sync with the registry", async () => {
    const host = makeHost();
    function CommandCount() {
      const cmds = useCommands();
      return createElement("span", { "data-testid": "n" }, String(cmds.length));
    }
    render(createElement(PluggerProvider, { host }, createElement(CommandCount)));
    expect(screen.getByTestId("n").textContent).toBe("0");
    await act(async () => {
      await host.use(
        definePlugin({
          name: "cmd",
          permissions: ["commands:register"],
          activate(ctx) {
            ctx.commands.register({ id: "do.thing", run: () => 1 });
          },
        }),
      );
    });
    expect(screen.getByTestId("n").textContent).toBe("1");
  });

  it("usePlugins reflects loaded plugins", async () => {
    const host = makeHost();
    function List() {
      const plugins = usePlugins();
      return createElement("span", { "data-testid": "p" }, String(plugins.length));
    }
    render(createElement(PluggerProvider, { host }, createElement(List)));
    expect(screen.getByTestId("p").textContent).toBe("0");
    await act(async () => {
      await host.use(definePlugin({ name: "x" }));
    });
    expect(screen.getByTestId("p").textContent).toBe("1");
  });

  it("throws a helpful error when used outside a provider", () => {
    function Bad() {
      usePluginStore<State, number>((s) => s.count);
      return null;
    }
    expect(() => render(createElement(Bad))).toThrow(/PluggerProvider/);
  });
});
