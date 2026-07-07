/**
 * @plugger/react — idiomatic React bindings for a Plugger host.
 *
 * ```tsx
 * <PluggerProvider host={host}>
 *   <PluggerSlot name="sidebar" />
 * </PluggerProvider>
 * ```
 */
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { renderSlot, type SlotRenderOptions } from "@plugger/vanilla";
import type { PluginHost, PluginRecord, RegisteredCommand } from "@plugger/core";

const HostContext = createContext<PluginHost<never, never> | null>(null);

export interface PluggerProviderProps {
  host: PluginHost<never, never> | PluginHost;
  children?: ReactNode;
}

export function PluggerProvider({ host, children }: PluggerProviderProps): ReactNode {
  return createElement(
    HostContext.Provider,
    { value: host as PluginHost<never, never> },
    children,
  );
}

/** Access the host provided by the nearest {@link PluggerProvider}. */
export function usePluggerHost<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
>(): PluginHost<API, S> {
  const host = useContext(HostContext);
  if (!host) {
    throw new Error("usePluggerHost must be used within a <PluggerProvider>.");
  }
  return host as unknown as PluginHost<API, S>;
}

export interface PluggerSlotProps extends SlotRenderOptions {
  /** Slot name to render. */
  name: string;
  /** Host override (defaults to the provider's host). */
  host?: PluginHost<never, never> | PluginHost;
  /** Tag for the outer container. Default `"div"`. */
  as?: keyof HTMLElementTagNameMap;
  className?: string;
  style?: Record<string, string | number>;
  /** Rendered when the slot has no contributions. */
  fallback?: ReactNode;
}

/** Render every plugin contribution for a slot. */
export function PluggerSlot({
  name,
  host: hostProp,
  as = "div",
  className,
  style,
  fallback,
  props,
  tagName,
  decorateWrapper,
}: PluggerSlotProps): ReactNode {
  const ctxHost = useContext(HostContext);
  const host = (hostProp ?? ctxHost) as PluginHost | null;
  if (!host) throw new Error("<PluggerSlot> needs a host prop or a <PluggerProvider>.");

  const containerRef = useRef<HTMLElement | null>(null);
  const count = useSlotCount(host, name);

  // Stable identity for props so effects don't thrash on every render.
  const propsKey = JSON.stringify(props ?? {});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handle = renderSlot(host, name, el, { props, tagName, decorateWrapper });
    return () => handle.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, name, propsKey, tagName]);

  // The inner div is rendered by React with *no* children, so React never
  // reconciles (and thus never wipes) the nodes that renderSlot mounts into it.
  // The fallback is a separate, React-owned sibling.
  return createElement(
    as,
    { className, style, "data-plugger-slot-container": name },
    createElement("div", {
      ref: containerRef as never,
      style: { display: "contents" },
      key: "__plugger_mount__",
    }),
    count === 0 ? fallback : null,
  );
}

/** Re-render when the number of contributions in a slot changes. */
export function useSlotCount(host: PluginHost, slot: string): number {
  const subscribe = useMemo(
    () => (cb: () => void) => host.onSlotChange(cb, slot),
    [host, slot],
  );
  return useSyncExternalStore(
    subscribe,
    () => host.getSlot(slot).length,
    () => host.getSlot(slot).length,
  );
}

/**
 * Subscribe to a slice of host state. Only re-renders when the slice changes.
 */
export function usePluginStore<S extends object, T>(
  selector: (state: S) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const host = usePluggerHost<Record<string, unknown>, S>();
  const store = host.store;
  const last = useRef<{ state: S; value: T } | null>(null);

  const getSnapshot = (): T => {
    const state = store.getState();
    if (last.current && last.current.state === state) return last.current.value;
    const value = selector(state);
    if (last.current && isEqual(value, last.current.value)) {
      last.current = { state, value: last.current.value };
      return last.current.value;
    }
    last.current = { state, value };
    return value;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/** The list of registered plugins, kept in sync with the host. */
export function usePlugins(host?: PluginHost): PluginRecord[] {
  const ctxHost = useContext(HostContext);
  const h = (host ?? ctxHost) as PluginHost;
  const [, force] = useState(0);
  useEffect(() => {
    const events = [
      "plugin:loaded",
      "plugin:activated",
      "plugin:deactivated",
      "plugin:removed",
      "plugin:error",
    ];
    const offs = events.map((e) => h.on(e, () => force((n) => n + 1)));
    return () => offs.forEach((off) => off());
  }, [h]);
  return h.list();
}

/** The list of registered commands, kept in sync with the host. */
export function useCommands(host?: PluginHost): RegisteredCommand[] {
  const ctxHost = useContext(HostContext);
  const h = (host ?? ctxHost) as PluginHost;
  // Cache the snapshot so useSyncExternalStore sees a stable reference until a
  // change actually occurs (list() returns a fresh array on every call).
  const cache = useRef<RegisteredCommand[]>(h.commands.list());
  const subscribe = useMemo(
    () => (cb: () => void) =>
      h.commands.onChange(() => {
        cache.current = h.commands.list();
        cb();
      }),
    [h],
  );
  return useSyncExternalStore(
    subscribe,
    () => cache.current,
    () => cache.current,
  );
}
