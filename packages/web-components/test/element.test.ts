import { beforeEach, describe, expect, it } from "vitest";
import { createPluginHost, definePlugin, type PluginHost } from "@plugger/core";
import {
  definePluggerElements,
  getDefaultHost,
  PluggerSlotElement,
  setDefaultHost,
} from "../src/index.js";

async function hostWithWidget(text: string, slot = "bar"): Promise<PluginHost> {
  const host = createPluginHost({ slots: [slot] });
  await host.use(
    definePlugin({
      name: "w",
      permissions: ["ui:render"],
      activate(ctx) {
        ctx.ui.contribute(slot, { mount: (el) => (el.textContent = text) });
      },
    }),
  );
  return host;
}

describe("<plugger-slot>", () => {
  beforeEach(() => {
    definePluggerElements();
    document.body.innerHTML = "";
    setDefaultHost(null as never);
  });

  it("registers the custom element", () => {
    expect(customElements.get("plugger-slot")).toBe(PluggerSlotElement);
  });

  it("renders contributions from the default host", async () => {
    setDefaultHost(await hostWithWidget("hello"));
    const el = document.createElement("plugger-slot") as PluggerSlotElement;
    el.setAttribute("name", "bar");
    document.body.appendChild(el);
    expect(el.textContent).toContain("hello");
  });

  it("prefers an imperatively assigned host over the default", async () => {
    setDefaultHost(await hostWithWidget("default"));
    const el = document.createElement("plugger-slot") as PluggerSlotElement;
    el.host = await hostWithWidget("explicit");
    el.setAttribute("name", "bar");
    document.body.appendChild(el);
    expect(el.textContent).toContain("explicit");
  });

  it("cleans up when disconnected", async () => {
    const host = await hostWithWidget("bye");
    const el = document.createElement("plugger-slot") as PluggerSlotElement;
    el.host = host;
    el.setAttribute("name", "bar");
    document.body.appendChild(el);
    expect(el.children.length).toBeGreaterThan(0);
    el.remove();
    expect(el.children.length).toBe(0);
  });

  it("re-renders when the name attribute changes", async () => {
    const host = createPluginHost({ slots: ["a", "b"] });
    await host.use(
      definePlugin({
        name: "p",
        permissions: ["ui:render"],
        activate(ctx) {
          ctx.ui.contribute("a", { mount: (el) => (el.textContent = "AA") });
          ctx.ui.contribute("b", { mount: (el) => (el.textContent = "BB") });
        },
      }),
    );
    const el = document.createElement("plugger-slot") as PluggerSlotElement;
    el.host = host;
    el.setAttribute("name", "a");
    document.body.appendChild(el);
    expect(el.textContent).toContain("AA");
    el.setAttribute("name", "b");
    expect(el.textContent).toContain("BB");
  });

  it("exposes the resolved host via getDefaultHost", async () => {
    const host = await hostWithWidget("x");
    setDefaultHost(host);
    expect(getDefaultHost()).toBe(host);
  });
});
