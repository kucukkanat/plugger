import type { EventBus, EventHandler, Unsubscribe } from "./types.js";

/**
 * A tiny synchronous event emitter. Handlers added during an emit are not
 * invoked for that emit; handlers removed during an emit are not invoked either
 * (we iterate over a snapshot but re-check membership).
 */
export function createEventBus(): EventBus {
  const map = new Map<string, Set<EventHandler>>();

  const on = <T>(event: string, handler: EventHandler<T>): Unsubscribe => {
    let set = map.get(event);
    if (!set) {
      set = new Set();
      map.set(event, set);
    }
    set.add(handler as EventHandler);
    return () => off(event, handler as EventHandler);
  };

  const once = <T>(event: string, handler: EventHandler<T>): Unsubscribe => {
    const wrapped: EventHandler<T> = (payload) => {
      off(event, wrapped as EventHandler);
      handler(payload);
    };
    return on(event, wrapped);
  };

  const off = (event: string, handler: EventHandler): void => {
    const set = map.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) map.delete(event);
  };

  const emit = <T>(event: string, payload?: T): void => {
    const set = map.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      if (set.has(handler)) handler(payload);
    }
  };

  return { on, once, off, emit };
}

/**
 * Wrap an {@link EventBus} so every event name is prefixed with a namespace.
 * Used to isolate per-plugin event traffic while sharing one underlying bus.
 */
export function namespacedBus(bus: EventBus, namespace: string): EventBus {
  const scope = (event: string) =>
    event.startsWith("@") ? event.slice(1) : `${namespace}:${event}`;
  return {
    on: (event, handler) => bus.on(scope(event), handler),
    once: (event, handler) => bus.once(scope(event), handler),
    off: (event, handler) => bus.off(scope(event), handler),
    emit: (event, payload) => bus.emit(scope(event), payload),
  };
}
