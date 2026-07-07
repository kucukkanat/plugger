import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/vue";
import { defineComponent, h } from "vue";
import { createPluginHost, definePlugin, type PluginHost } from "@plugger/core";
import { PluggerSlot, providePlugger, usePluginStore } from "../src/index.js";

interface State {
  count: number;
}

function makeHost() {
  return createPluginHost<Record<string, never>, State>({
    state: { count: 0 },
    slots: ["bar"],
  });
}

const wrap = (host: PluginHost, child: ReturnType<typeof defineComponent>) =>
  defineComponent({
    setup() {
      providePlugger(host);
      return () => h(child);
    },
  });

afterEach(cleanup);

describe("@plugger/vue", () => {
  it("renders plugin contributions in a slot", async () => {
    const host = makeHost();
    await host.use(
      definePlugin({
        name: "w",
        permissions: ["ui:render"],
        activate(ctx) {
          ctx.ui.contribute("bar", { mount: (el) => (el.textContent = "vue-widget") });
        },
      }),
    );
    const Child = defineComponent({ setup: () => () => h(PluggerSlot, { name: "bar" }) });
    const { container } = render(wrap(host, Child));
    await waitFor(() => expect(container.textContent).toContain("vue-widget"));
  });

  it("usePluginStore is reactive", async () => {
    const host = makeHost();
    const Child = defineComponent({
      setup() {
        const count = usePluginStore<State, number>((s) => s.count);
        return () => h("span", { "data-testid": "c" }, String(count.value));
      },
    });
    const { getByTestId } = render(wrap(host, Child));
    expect(getByTestId("c").textContent).toBe("0");
    host.store.setState({ count: 7 });
    await waitFor(() => expect(getByTestId("c").textContent).toBe("7"));
  });
});
