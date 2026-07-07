/**
 * @plugger/vanilla — framework-free helpers for rendering plugin UI
 * contributions into the DOM. Every other adapter (React, Vue, Preact, Web
 * Components) is a thin wrapper over {@link renderSlot}.
 */
import type { PluginHost, UIContribution, Unsubscribe } from "@plugger/core";

/**
 * The minimal structural surface `renderSlot` needs from a host. Accepting this
 * (rather than a concrete `PluginHost<API, S>`) means a host with any state/API
 * generics can be rendered without variance friction.
 */
export interface SlotSource {
  getSlot(slot: string): UIContribution[];
  onSlotChange(listener: (slot: string) => void, slot?: string): Unsubscribe;
}

export interface SlotRenderOptions {
  /** Props passed to every contribution's mount context. */
  props?: Record<string, unknown>;
  /** Tag name for the per-contribution wrapper element. Default `"div"`. */
  tagName?: string;
  /**
   * Customise each wrapper element (add classes, data attributes, …). Called
   * once, right after the wrapper is created.
   */
  decorateWrapper?: (element: HTMLElement, contribution: UIContribution) => void;
}

export interface SlotHandle {
  /** Force a re-render (rarely needed — slot changes auto-refresh). */
  refresh(): void;
  /** Update the props supplied to contributions and re-render. */
  setProps(props: Record<string, unknown>): void;
  /** Unmount every contribution and stop listening for changes. */
  dispose(): void;
}

interface Mounted {
  contribution: UIContribution;
  wrapper: HTMLElement;
  cleanup?: () => void;
}

const runCleanup = (value: void | (() => void) | { dispose(): void }): (() => void) | undefined => {
  if (typeof value === "function") return value;
  if (value && typeof (value as { dispose(): void }).dispose === "function") {
    return () => (value as { dispose(): void }).dispose();
  }
  return undefined;
};

/**
 * Render the contributions of `slot` into `container`, keeping the DOM in sync
 * as plugins are activated or deactivated. Uses a keyed diff so unrelated
 * contributions are never needlessly remounted.
 */
export function renderSlot(
  host: SlotSource,
  slot: string,
  container: HTMLElement,
  options: SlotRenderOptions = {},
): SlotHandle {
  const tagName = options.tagName ?? "div";
  let props = options.props ?? {};
  const mounted = new Map<string, Mounted>();

  const doc = container.ownerDocument ?? document;

  const render = (): void => {
    const contributions = host.getSlot(slot);
    const nextIds = new Set(contributions.map((c) => c.id));

    // Remove contributions that are gone.
    for (const [id, entry] of mounted) {
      if (!nextIds.has(id)) {
        entry.cleanup?.();
        entry.wrapper.remove();
        mounted.delete(id);
      }
    }

    // Add new contributions (preserving existing ones).
    for (const contribution of contributions) {
      if (mounted.has(contribution.id)) continue;
      const wrapper = doc.createElement(tagName);
      wrapper.setAttribute("data-plugger-slot", slot);
      wrapper.setAttribute("data-plugger-owner", contribution.owner);
      wrapper.setAttribute("data-plugger-id", contribution.id);
      options.decorateWrapper?.(wrapper, contribution);
      const result = contribution.mount(wrapper, { slot, props, document: doc });
      mounted.set(contribution.id, {
        contribution,
        wrapper,
        cleanup: runCleanup(result),
      });
    }

    // Reorder DOM to match contribution order.
    for (const contribution of contributions) {
      const entry = mounted.get(contribution.id);
      if (entry) container.appendChild(entry.wrapper);
    }
  };

  render();
  const unsubscribe = host.onSlotChange(() => render(), slot);

  return {
    refresh: render,
    setProps(next) {
      props = next;
      // Remount everything so contributions receive the new props.
      for (const entry of mounted.values()) {
        entry.cleanup?.();
        entry.wrapper.remove();
      }
      mounted.clear();
      render();
    },
    dispose() {
      unsubscribe();
      for (const entry of mounted.values()) {
        entry.cleanup?.();
        entry.wrapper.remove();
      }
      mounted.clear();
    },
  };
}

export type { PluginHost, UIContribution } from "@plugger/core";
