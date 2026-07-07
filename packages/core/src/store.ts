import type {
  Selector,
  SelectorListener,
  StateListener,
  StatePatch,
  Store,
  Unsubscribe,
} from "./types.js";

const isFunction = (value: unknown): value is (...args: never[]) => unknown =>
  typeof value === "function";

/** Default reference/shallow-value equality used by `select`. */
export const strictEqual = <T>(a: T, b: T): boolean => Object.is(a, b);

/**
 * Create a small reactive store. Intentionally dependency-free so it can run in
 * any browser without a build step. State is treated as immutable: `setState`
 * shallow-merges a patch and produces a new object reference.
 */
export function createStore<S extends object>(initialState: S): Store<S> {
  let state = { ...initialState };
  const listeners = new Set<StateListener<S>>();

  const getState = (): S => state;

  const setState = (patch: StatePatch<S>): void => {
    const partial = isFunction(patch) ? patch(state) : patch;
    // Ignore no-op patches to avoid spurious notifications.
    if (partial == null) return;
    const previous = state;
    let changed = false;
    for (const key in partial) {
      if (!Object.is(previous[key as keyof S], partial[key as keyof S])) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...previous, ...partial };
    // Snapshot listeners so unsubscribing mid-notification is safe.
    for (const listener of [...listeners]) {
      listener(state, previous);
    }
  };

  const subscribe = (listener: StateListener<S>): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const select = <T>(
    selector: Selector<S, T>,
    listener: SelectorListener<T>,
    options?: { equals?: (a: T, b: T) => boolean; immediate?: boolean },
  ): Unsubscribe => {
    const equals = options?.equals ?? strictEqual;
    let current = selector(state);
    if (options?.immediate) listener(current, current);
    return subscribe((next) => {
      const nextValue = selector(next);
      if (!equals(nextValue, current)) {
        const previous = current;
        current = nextValue;
        listener(nextValue, previous);
      }
    });
  };

  return {
    getState,
    setState,
    subscribe,
    select,
    get size() {
      return listeners.size;
    },
  };
}
