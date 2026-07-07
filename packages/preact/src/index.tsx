/**
 * @plugger/preact — Preact bindings for a Plugger host. Mirrors the React
 * adapter's API but depends only on `preact` + `preact/hooks`.
 */
import { createContext, createElement, type ComponentChildren } from "preact";
import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { renderSlot, type SlotRenderOptions } from "@plugger/vanilla";
import type { PluginHost, PluginRecord, RegisteredCommand } from "@plugger/core";

const HostContext = createContext<PluginHost | null>(null);

export interface PluggerProviderProps {
  host: PluginHost<any, any>;
  children?: ComponentChildren;
}

export function PluggerProvider({ host, children }: PluggerProviderProps) {
  return createElement(HostContext.Provider, { value: host as PluginHost }, children);
}

export function usePluggerHost<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
>(): PluginHost<API, S> {
  const host = useContext(HostContext);
  if (!host) throw new Error("usePluggerHost must be used within a <PluggerProvider>.");
  return host as unknown as PluginHost<API, S>;
}

/** Force a re-render whenever `subscribe` fires. */
function useSubscription(subscribe: (cb: () => void) => () => void): void {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((n) => n + 1)), [subscribe]);
}

export interface PluggerSlotProps extends SlotRenderOptions {
  name: string;
  host?: PluginHost<any, any>;
  as?: keyof HTMLElementTagNameMap;
  class?: string;
  fallback?: ComponentChildren;
}

export function PluggerSlot({
  name,
  host: hostProp,
  as = "div",
  class: className,
  fallback,
  props,
  tagName,
  decorateWrapper,
}: PluggerSlotProps) {
  const ctxHost = useContext(HostContext);
  const host = (hostProp ?? ctxHost) as PluginHost | null;
  if (!host) throw new Error("<PluggerSlot> needs a host prop or a <PluggerProvider>.");

  const containerRef = useRef<HTMLElement | null>(null);
  const subscribe = useMemo(
    () => (cb: () => void) => host.onSlotChange(cb, name),
    [host, name],
  );
  useSubscription(subscribe);
  const propsKey = JSON.stringify(props ?? {});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handle = renderSlot(host, name, el, { props, tagName, decorateWrapper });
    return () => handle.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, name, propsKey, tagName]);

  const empty = host.getSlot(name).length === 0;
  // Inner node has no vnode children, so Preact leaves the imperatively-mounted
  // DOM untouched across re-renders; the fallback is a separate sibling.
  return createElement(
    as,
    { class: className, "data-plugger-slot-container": name },
    createElement("div", { ref: containerRef, style: "display:contents" }),
    empty ? fallback : null,
  );
}

export function usePluginStore<S extends object, T>(
  selector: (state: S) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const host = usePluggerHost<Record<string, unknown>, S>();
  const value = useRef<T>(selector(host.store.getState() as S));
  const subscribe = useMemo(
    () => (cb: () => void) =>
      host.store.subscribe((state) => {
        const next = selector(state as S);
        if (!isEqual(next, value.current)) {
          value.current = next;
          cb();
        }
      }),
    [host, selector, isEqual],
  );
  useSubscription(subscribe);
  return value.current;
}

export function usePlugins(host?: PluginHost): PluginRecord[] {
  const ctxHost = useContext(HostContext);
  const h = (host ?? ctxHost) as PluginHost;
  const subscribe = useMemo(
    () => (cb: () => void) => {
      const offs = [
        "plugin:loaded",
        "plugin:activated",
        "plugin:deactivated",
        "plugin:removed",
        "plugin:error",
      ].map((e) => h.on(e, cb));
      return () => offs.forEach((off) => off());
    },
    [h],
  );
  useSubscription(subscribe);
  return h.list();
}

export function useCommands(host?: PluginHost): RegisteredCommand[] {
  const ctxHost = useContext(HostContext);
  const h = (host ?? ctxHost) as PluginHost;
  const subscribe = useMemo(() => (cb: () => void) => h.commands.onChange(cb), [h]);
  useSubscription(subscribe);
  return h.commands.list();
}
