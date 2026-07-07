/**
 * Core type definitions for Plugger.
 *
 * These types describe the contract between the three actors in the system:
 *
 *  - The **application author** (host owner) who calls {@link createPluginHost}
 *    and exposes state, services, commands and UI slots.
 *  - The **plugin author** who writes an ES module whose default export is a
 *    {@link PluginDefinition} created with `definePlugin`.
 *  - The **runtime** that resolves, loads, activates and sandboxes plugins.
 */

/** A value that can be disposed to release resources / undo a side effect. */
export interface Disposable {
  dispose(): void;
}

export type Unsubscribe = () => void;

/* -------------------------------------------------------------------------- */
/* Sources                                                                    */
/* -------------------------------------------------------------------------- */

/** Supported content-delivery networks for resolving npm / git sources. */
export type CdnProvider = "esm.sh" | "jsdelivr" | "skypack" | "unpkg";

/** A direct URL to an ES module. */
export interface UrlSource {
  type: "url";
  url: string;
}

/** An npm package, resolved through a CDN into an ES module URL. */
export interface NpmSource {
  type: "npm";
  /** Bare package name, optionally scoped, optionally with a subpath. */
  name: string;
  /** Semver range or exact version. Defaults to `latest`. */
  version?: string;
  /** Override the host's default CDN for this source. */
  cdn?: CdnProvider;
}

/** A git repository (GitHub only for CDN resolution), resolved through a CDN. */
export interface GitSource {
  type: "git";
  /** `owner/repo` on GitHub. */
  repo: string;
  /** Branch, tag or commit-ish. Defaults to the repo default branch. */
  ref?: string;
  /** File subpath inside the repo (e.g. `dist/index.mjs`). */
  path?: string;
  cdn?: CdnProvider;
}

/**
 * A pre-loaded module — useful for tests, local development and bundled
 * first-party plugins where no network resolution is required.
 */
export interface ModuleSource {
  type: "module";
  module: PluginModule;
}

export type StructuredSource =
  | UrlSource
  | NpmSource
  | GitSource
  | ModuleSource;

/**
 * A plugin source. Either a fully-structured object or a shorthand string that
 * the resolver classifies:
 *
 *  - `https://…` / `http://` / `/local/path.js`  → {@link UrlSource}
 *  - `github:owner/repo`, `gh:owner/repo@ref`     → {@link GitSource}
 *  - `@scope/name`, `name`, `name@1.2.3`          → {@link NpmSource}
 */
export type PluginSource = string | StructuredSource;

/* -------------------------------------------------------------------------- */
/* Permissions                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Capabilities a plugin can request. The host decides which are granted at load
 * time. Context methods are permission-gated and throw {@link PermissionError}
 * when a capability was not granted.
 */
export type Permission =
  | "state:read"
  | "state:write"
  | "ui:render"
  | "commands:register"
  | "commands:execute"
  | "events:emit"
  | "events:listen"
  | "storage"
  | "network"
  | `api:${string}`;

export interface PermissionPolicy {
  /** Permissions granted to every plugin unless explicitly denied. */
  default?: Permission[];
  /** Per-plugin grants keyed by plugin name (matched after load). */
  grants?: Record<string, Permission[]>;
  /**
   * Called for each requested permission the policy does not already grant.
   * Return `true` to grant. Enables interactive consent flows.
   */
  onRequest?: (
    permission: Permission,
    pluginName: string,
  ) => boolean | Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

export type StateListener<S> = (state: S, previous: S) => void;
export type Selector<S, T> = (state: S) => T;
export type SelectorListener<T> = (value: T, previous: T) => void;
export type StatePatch<S> = Partial<S> | ((state: S) => Partial<S>);

/** A minimal reactive store shared between the host and its plugins. */
export interface Store<S extends object = Record<string, unknown>> {
  getState(): S;
  setState(patch: StatePatch<S>): void;
  subscribe(listener: StateListener<S>): Unsubscribe;
  /** Subscribe to a derived slice; only fires when the slice changes. */
  select<T>(
    selector: Selector<S, T>,
    listener: SelectorListener<T>,
    options?: { equals?: (a: T, b: T) => boolean; immediate?: boolean },
  ): Unsubscribe;
  /** Number of active subscribers (useful for tests / diagnostics). */
  readonly size: number;
}

/**
 * A store view handed to a plugin. Writes are permission-gated and every
 * subscription is tracked so it can be torn down automatically on deactivate.
 */
export interface ScopedStore<S extends object = Record<string, unknown>> {
  getState(): S;
  setState(patch: StatePatch<S>): void;
  subscribe(listener: StateListener<S>): Unsubscribe;
  select<T>(
    selector: Selector<S, T>,
    listener: SelectorListener<T>,
    options?: { equals?: (a: T, b: T) => boolean; immediate?: boolean },
  ): Unsubscribe;
}

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

export type EventHandler<T = unknown> = (payload: T) => void;

export interface EventBus {
  on<T = unknown>(event: string, handler: EventHandler<T>): Unsubscribe;
  once<T = unknown>(event: string, handler: EventHandler<T>): Unsubscribe;
  off(event: string, handler: EventHandler): void;
  emit<T = unknown>(event: string, payload?: T): void;
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

export interface CommandDefinition<Args extends unknown[] = unknown[], R = unknown> {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  run: (...args: Args) => R;
}

export interface RegisteredCommand extends CommandDefinition {
  /** Plugin (or `"host"`) that owns this command. */
  owner: string;
}

/* -------------------------------------------------------------------------- */
/* UI contributions                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The framework-agnostic unit of UI. A plugin returns a `mount` function that
 * receives a host-owned DOM element; adapters for React / Vue / Preact / Web
 * Components simply place that element and call `mount`. This DOM-as-lingua-
 * franca design is what lets a single plugin work inside any SPA.
 */
export interface UIContributionSpec {
  /** Stable id, unique within its slot & owner. */
  id?: string;
  /** Ordering hint within a slot (lower renders first). Default `0`. */
  order?: number;
  /** Arbitrary metadata (title, icon name, tooltip, …). */
  meta?: Record<string, unknown>;
  /**
   * Called when the contribution should render. Return an optional cleanup
   * function (or Disposable) — invoked on unmount / deactivate.
   */
  mount: (
    element: HTMLElement,
    context: UIMountContext,
  ) => void | (() => void) | Disposable;
}

export interface UIMountContext {
  /** The slot this contribution is being rendered into. */
  slot: string;
  /** Props supplied by the host when rendering the slot. */
  props: Record<string, unknown>;
  /** Document the element belongs to (for creating child nodes). */
  document: Document;
}

export interface UIContribution extends Required<Pick<UIContributionSpec, "id" | "order">> {
  slot: string;
  owner: string;
  meta: Record<string, unknown>;
  mount: UIContributionSpec["mount"];
}

/* -------------------------------------------------------------------------- */
/* Plugin definition & context                                               */
/* -------------------------------------------------------------------------- */

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * The context object handed to `activate`. Everything a plugin can do to the
 * host flows through here, and every capability is permission-gated.
 */
export interface PluginContext<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
> {
  /** Identity of this plugin. */
  readonly meta: Readonly<Required<Pick<PluginDefinition, "name">> & Partial<PluginDefinition>>;
  /**
   * Reactive application state, permission-gated. If the host declared no
   * state, this is an empty store — safe to ignore in imperative-only plugins.
   */
  readonly store: ScopedStore<S>;
  /** Services the application author chose to expose. */
  readonly api: API;
  /** Register / execute commands. */
  readonly commands: PluginCommandApi;
  /** Contribute UI into named slots. */
  readonly ui: PluginUIApi;
  /** Namespaced pub/sub. */
  readonly events: EventBus;
  /** Namespaced console. */
  readonly logger: Logger;
  /** Namespaced, permission-gated persistent key/value storage. */
  readonly storage: PluginStorage;
  /** Add a disposable that is cleaned up automatically on deactivate. */
  subscribe(disposable: Disposable | Unsubscribe): void;
  /** Whether a capability was granted to this plugin. */
  hasPermission(permission: Permission): boolean;
}

export interface PluginCommandApi {
  register<Args extends unknown[], R>(
    command: CommandDefinition<Args, R>,
  ): Disposable;
  execute<R = unknown>(id: string, ...args: unknown[]): R;
  has(id: string): boolean;
  list(): RegisteredCommand[];
}

export interface PluginUIApi {
  /** Contribute a UI fragment into a named slot. Returns a handle to remove it. */
  contribute(slot: string, spec: UIContributionSpec): Disposable;
  /** List the slots the host has declared. */
  slots(): string[];
}

export interface PluginStorage {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): void;
  remove(key: string): void;
  keys(): string[];
  clear(): void;
}

/**
 * The object a plugin author exports. Created with `definePlugin` for full type
 * inference of the host's API and state shape.
 */
export interface PluginDefinition<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
> {
  /** Unique, stable identifier. */
  name: string;
  version?: string;
  description?: string;
  author?: string;
  /** Homepage / repository URL. */
  homepage?: string;
  /** Capabilities this plugin needs to function. */
  permissions?: Permission[];
  /** Other plugin names that must be active first. */
  dependencies?: string[];
  /**
   * Called when the plugin is activated. May be async. Anything registered via
   * the context is torn down automatically when the plugin deactivates.
   */
  activate?: (context: PluginContext<API, S>) => void | Promise<void>;
  /** Called before the plugin is deactivated. */
  deactivate?: (context: PluginContext<API, S>) => void | Promise<void>;
}

/** Shape of an imported plugin ES module. */
export interface PluginModule {
  default?: PluginDefinition | (() => PluginDefinition | Promise<PluginDefinition>);
  plugin?: PluginDefinition;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Runtime records                                                            */
/* -------------------------------------------------------------------------- */

export type PluginStatus =
  | "loaded"
  | "activating"
  | "active"
  | "deactivating"
  | "inactive"
  | "error";

export interface PluginRecord {
  readonly name: string;
  readonly definition: PluginDefinition;
  readonly source: StructuredSource;
  readonly permissions: Permission[];
  status: PluginStatus;
  error?: Error;
}

/* -------------------------------------------------------------------------- */
/* Host                                                                       */
/* -------------------------------------------------------------------------- */

export interface HostEvents {
  "plugin:loaded": { name: string };
  "plugin:activated": { name: string };
  "plugin:deactivated": { name: string };
  "plugin:removed": { name: string };
  "plugin:error": { name: string; error: Error };
  "ui:changed": { slot: string };
  "commands:changed": Record<string, never>;
}

/** Function used to import a resolved module URL. Injectable for testing. */
export type ModuleImporter = (url: string) => Promise<PluginModule>;

export interface PluginHostOptions<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
> {
  /**
   * Optional shared state: an initial value Plugger wraps in a store, or a
   * pre-built {@link Store} to reuse your app's existing state. Omit it
   * entirely for imperative-only hosts — the store is then simply empty.
   */
  state?: S | Store<S>;
  /** Services exposed to plugins under `context.api`. */
  api?: API;
  /** UI slot names the host declares up front (others can be created lazily). */
  slots?: string[];
  /** Permission policy. Defaults to granting the plugin's requested permissions. */
  permissions?: PermissionPolicy;
  /** Default CDN for npm/git resolution. Defaults to `esm.sh`. */
  cdn?: CdnProvider;
  /** Custom module importer (defaults to native dynamic `import`). */
  importer?: ModuleImporter;
  /** Persistent storage backend. Defaults to in-memory (or `localStorage`). */
  storage?: KeyValueStorage;
  /** Logger. Defaults to `console`. */
  logger?: Logger;
  /** Activate plugins immediately after loading. Default `true`. */
  autoActivate?: boolean;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export interface LoadOptions {
  /** Permissions to grant this specific plugin (merged with the policy). */
  permissions?: Permission[];
  /** Override auto-activation for this load. */
  activate?: boolean;
}
