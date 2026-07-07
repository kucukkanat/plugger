/**
 * @plugger/core — a browser-native meta framework for building lazily-loaded
 * plugins for any single-page application.
 *
 * @packageDocumentation
 */

export { createPluginHost, PluginHost } from "./host.js";
export { definePlugin } from "./plugin.js";
export type { HostContract, PluginFor } from "./plugin.js";

export { createStore, strictEqual } from "./store.js";
export { createEventBus, namespacedBus } from "./events.js";
export {
  createMemoryStorage,
  createPluginStorage,
  defaultStorage,
} from "./storage.js";

export {
  normalizeSource,
  parseNpmSpec,
  resolveModuleUrl,
  describeSource,
  isUrlSource,
  isNpmSource,
  isGitSource,
  isModuleSource,
  SourceError,
} from "./resolver.js";

export { loadPluginModule, extractDefinition, nativeImporter, LoadError } from "./loader.js";
export { CommandRegistry, UIRegistry, CommandError } from "./registry.js";
export { PermissionSet, PermissionError, resolvePermissions } from "./permissions.js";

export type * from "./types.js";
