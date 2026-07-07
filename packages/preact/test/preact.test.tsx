import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/preact";
import { createElement } from "preact";
import { createPluginHost, definePlugin } from "@plugger/core";
import { PluggerProvider, PluggerSlot, usePluginStore } from "../src/index.js";

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

describe("@plugger/preact", () => {
  it("renders plugin contributions in a slot", async () => {
    const host = makeHost();
    await host.use(
      definePlugin({
        name: "w",
        permissions: ["ui:render"],
        activate(ctx) {
          ctx.ui.contribute("bar", { mount: (el) => (el.textContent = "preact-widget") });
        },
      }),
    );
    const { container } = render(
      createElement(PluggerProvider, { host }, createElement(PluggerSlot, { name: "bar" })),
    );
    await waitFor(() => expect(container.textContent).toContain("preact-widget"));
  });

  it("usePluginStore updates on state change", async () => {
    const host = makeHost();
    function Counter() {
      const count = usePluginStore<State, number>((s) => s.count);
      return createElement("span", { "data-testid": "c" }, String(count));
    }
    const { getByTestId } = render(
      createElement(PluggerProvider, { host }, createElement(Counter)),
    );
    expect(getByTestId("c").textContent).toBe("0");
    host.store.setState({ count: 9 });
    await waitFor(() => expect(getByTestId("c").textContent).toBe("9"));
  });
});
