import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPluginHost, definePlugin, type PluginHost } from "@plugger/core";
import { renderSlot } from "../src/index.js";

interface State {
  label: string;
}

function makeHost() {
  return createPluginHost<Record<string, never>, State>({
    state: { label: "hello" },
    slots: ["bar"],
  });
}

async function contribute(
  host: PluginHost,
  name: string,
  slot: string,
  render: (el: HTMLElement) => void | (() => void),
  order = 0,
) {
  await host.use(
    definePlugin({
      name,
      permissions: ["ui:render"],
      activate(ctx) {
        ctx.ui.contribute(slot, { id: name, order, mount: (el) => render(el) });
      },
    }),
  );
}

describe("renderSlot", () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("renders existing contributions immediately", async () => {
    const host = makeHost();
    await contribute(host, "a", "bar", (el) => (el.textContent = "A"));
    const handle = renderSlot(host, "bar", container);
    expect(container.textContent).toBe("A");
    expect(container.querySelector("[data-plugger-id='a']")).not.toBeNull();
    handle.dispose();
  });

  it("renders contributions added after mount", async () => {
    const host = makeHost();
    const handle = renderSlot(host, "bar", container);
    expect(container.children).toHaveLength(0);
    await contribute(host, "a", "bar", (el) => (el.textContent = "A"));
    expect(container.textContent).toBe("A");
    handle.dispose();
  });

  it("removes contributions when a plugin deactivates and runs cleanup", async () => {
    const host = makeHost();
    const cleanup = vi.fn();
    await contribute(host, "a", "bar", (el) => {
      el.textContent = "A";
      return cleanup;
    });
    const handle = renderSlot(host, "bar", container);
    expect(container.children).toHaveLength(1);
    await host.deactivate("a");
    expect(container.children).toHaveLength(0);
    expect(cleanup).toHaveBeenCalledOnce();
    handle.dispose();
  });

  it("orders contributions by their order field", async () => {
    const host = makeHost();
    await contribute(host, "second", "bar", (el) => (el.textContent = "2"), 2);
    await contribute(host, "first", "bar", (el) => (el.textContent = "1"), 1);
    const handle = renderSlot(host, "bar", container);
    expect(container.textContent).toBe("12");
    handle.dispose();
  });

  it("does not remount existing contributions when another is added (keyed diff)", async () => {
    const host = makeHost();
    const mountA = vi.fn((el: HTMLElement) => (el.textContent = "A"));
    await contribute(host, "a", "bar", mountA);
    const handle = renderSlot(host, "bar", container);
    expect(mountA).toHaveBeenCalledTimes(1);
    await contribute(host, "b", "bar", (el) => (el.textContent = "B"));
    expect(mountA).toHaveBeenCalledTimes(1); // A was not remounted
    expect(container.textContent).toBe("AB");
    handle.dispose();
  });

  it("passes props into the mount context and remounts on setProps", async () => {
    const host = makeHost();
    const seen: unknown[] = [];
    await host.use(
      definePlugin({
        name: "p",
        permissions: ["ui:render"],
        activate(ctx) {
          ctx.ui.contribute("bar", {
            mount: (el, mctx) => {
              seen.push(mctx.props.value);
              el.textContent = String(mctx.props.value);
            },
          });
        },
      }),
    );
    const handle = renderSlot(host, "bar", container, { props: { value: 1 } });
    expect(container.textContent).toBe("1");
    handle.setProps({ value: 2 });
    expect(container.textContent).toBe("2");
    expect(seen).toEqual([1, 2]);
    handle.dispose();
  });

  it("decorateWrapper can customise wrapper elements", async () => {
    const host = makeHost();
    await contribute(host, "a", "bar", (el) => (el.textContent = "A"));
    const handle = renderSlot(host, "bar", container, {
      decorateWrapper: (el) => el.classList.add("card"),
    });
    expect(container.querySelector(".card")).not.toBeNull();
    handle.dispose();
  });

  it("dispose unsubscribes and clears the container", async () => {
    const host = makeHost();
    await contribute(host, "a", "bar", (el) => (el.textContent = "A"));
    const handle = renderSlot(host, "bar", container);
    handle.dispose();
    expect(container.children).toHaveLength(0);
    // Further host changes must not touch the container.
    await contribute(host, "b", "bar", (el) => (el.textContent = "B"));
    expect(container.children).toHaveLength(0);
  });

  it("supports a Disposable cleanup return value", async () => {
    const host = makeHost();
    const dispose = vi.fn();
    await contribute(host, "a", "bar", () => ({ dispose }) as never);
    const handle = renderSlot(host, "bar", container);
    await host.deactivate("a");
    expect(dispose).toHaveBeenCalledOnce();
    handle.dispose();
  });
});
