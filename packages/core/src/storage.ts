import type { KeyValueStorage, PluginStorage } from "./types.js";

/** An in-memory {@link KeyValueStorage} used when no backend is provided. */
export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

/**
 * Pick a sensible default backend: `localStorage` in the browser, otherwise an
 * in-memory store. Never throws (e.g. in private-mode Safari).
 */
export function defaultStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== "undefined") {
      const probe = "__plugger_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return localStorage as unknown as KeyValueStorage;
    }
  } catch {
    /* fall through to memory */
  }
  return createMemoryStorage();
}

/**
 * A namespaced, JSON-serialising view over a {@link KeyValueStorage} backend,
 * handed to each plugin. Keys are prefixed with `plugger:<plugin>:` so plugins
 * cannot read or clobber each other's data.
 */
export function createPluginStorage(
  backend: KeyValueStorage,
  pluginName: string,
): PluginStorage {
  const prefix = `plugger:${pluginName}:`;
  const fullKey = (key: string) => prefix + key;

  const ownKeys = (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < backend.length; i++) {
      const k = backend.key(i);
      if (k && k.startsWith(prefix)) keys.push(k.slice(prefix.length));
    }
    return keys;
  };

  return {
    get<T>(key: string): T | undefined {
      const raw = backend.getItem(fullKey(key));
      if (raw == null) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },
    set<T>(key: string, value: T): void {
      backend.setItem(fullKey(key), JSON.stringify(value));
    },
    remove(key: string): void {
      backend.removeItem(fullKey(key));
    },
    keys(): string[] {
      return ownKeys();
    },
    clear(): void {
      for (const k of ownKeys()) backend.removeItem(fullKey(k));
    },
  };
}
