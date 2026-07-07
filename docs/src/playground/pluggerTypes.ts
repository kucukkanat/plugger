/**
 * Ambient type declarations fed to Monaco so plugin authors get full
 * autocomplete and type-checking for `@plugger/core` inside playgrounds —
 * without shipping the whole package's .d.ts graph to the browser.
 *
 * These mirror the plugin-author-facing surface of the real package.
 */
export const pluggerCoreDts = /* ts */ `
declare module "@plugger/core" {
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
    | (\`api:\${string}\` & {});

  export interface Disposable { dispose(): void; }
  export type Unsubscribe = () => void;

  export interface Logger {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  }

  export interface ScopedStore<S extends object = Record<string, unknown>> {
    /** Read the current application state (needs \`state:read\`). */
    getState(): S;
    /** Shallow-merge a patch into the state (needs \`state:write\`). */
    setState(patch: Partial<S> | ((state: S) => Partial<S>)): void;
    /** Subscribe to every state change (needs \`state:read\`). */
    subscribe(listener: (state: S, previous: S) => void): Unsubscribe;
    /** Subscribe to a derived slice; fires only when it changes. */
    select<T>(
      selector: (state: S) => T,
      listener: (value: T, previous: T) => void,
      options?: { equals?: (a: T, b: T) => boolean; immediate?: boolean }
    ): Unsubscribe;
  }

  export interface EventBus {
    on<T = unknown>(event: string, handler: (payload: T) => void): Unsubscribe;
    once<T = unknown>(event: string, handler: (payload: T) => void): Unsubscribe;
    off(event: string, handler: (payload: any) => void): void;
    emit<T = unknown>(event: string, payload?: T): void;
  }

  export interface CommandDefinition<Args extends unknown[] = unknown[], R = unknown> {
    id: string;
    title?: string;
    description?: string;
    category?: string;
    run: (...args: Args) => R;
  }

  export interface UIMountContext {
    slot: string;
    props: Record<string, unknown>;
    document: Document;
  }

  export interface UIContributionSpec {
    id?: string;
    order?: number;
    meta?: Record<string, unknown>;
    /** Render into a host-owned element. Return a cleanup fn or Disposable. */
    mount: (
      element: HTMLElement,
      context: UIMountContext
    ) => void | (() => void) | Disposable;
  }

  export interface PluginStorage {
    get<T = unknown>(key: string): T | undefined;
    set<T = unknown>(key: string, value: T): void;
    remove(key: string): void;
    keys(): string[];
    clear(): void;
  }

  export interface PluginContext<
    API extends object = Record<string, unknown>,
    S extends object = Record<string, unknown>
  > {
    /** Identity of this plugin. */
    readonly meta: { name: string; version?: string; description?: string };
    /** Reactive application state (permission-gated). */
    readonly store: ScopedStore<S>;
    /** Services the application author exposed. */
    readonly api: API;
    /** Register or run commands. */
    readonly commands: {
      register<Args extends unknown[], R>(command: CommandDefinition<Args, R>): Disposable;
      execute<R = unknown>(id: string, ...args: unknown[]): R;
      has(id: string): boolean;
      list(): Array<CommandDefinition & { owner: string }>;
    };
    /** Contribute UI into the host's named slots. */
    readonly ui: {
      contribute(slot: string, spec: UIContributionSpec): Disposable;
      slots(): string[];
    };
    /** Namespaced pub/sub. */
    readonly events: EventBus;
    /** Namespaced console. */
    readonly logger: Logger;
    /** Namespaced, permission-gated key/value storage. */
    readonly storage: PluginStorage;
    /** Register a disposable cleaned up automatically on deactivate. */
    subscribe(disposable: Disposable | Unsubscribe): void;
    /** Whether a capability was granted to this plugin. */
    hasPermission(permission: Permission): boolean;
  }

  export interface PluginDefinition<
    API extends object = Record<string, unknown>,
    S extends object = Record<string, unknown>
  > {
    /** Unique, stable identifier. */
    name: string;
    version?: string;
    description?: string;
    author?: string;
    homepage?: string;
    /** Capabilities this plugin needs to function. */
    permissions?: Permission[];
    /** Other plugin names that must be active first. */
    dependencies?: string[];
    /** Called when the plugin activates. May be async. */
    activate?: (context: PluginContext<API, S>) => void | Promise<void>;
    /** Called before the plugin deactivates. */
    deactivate?: (context: PluginContext<API, S>) => void | Promise<void>;
  }

  /** Identity helper giving full type inference when authoring a plugin. */
  export function definePlugin<
    API extends object = Record<string, unknown>,
    S extends object = Record<string, unknown>
  >(definition: PluginDefinition<API, S>): PluginDefinition<API, S>;
}
`;

/**
 * The demo host's contract, exposed to playground code as \`@demo/host\` so
 * examples can be strongly typed against the running preview app.
 */
export const demoHostDts = /* ts */ `
declare module "@demo/host" {
  export interface Todo { id: number; text: string; done: boolean; }
  export interface DemoState {
    /** The document title shown in the preview. */
    title: string;
    /** Word count of the document body. */
    words: number;
    /** UI theme. */
    theme: "light" | "dark";
    /** The to-do list. */
    todos: Todo[];
    /** Unread notification count. */
    unread: number;
  }
  export interface DemoApi {
    /** Show a toast notification in the status bar. */
    notify(message: string): void;
    /** Add a to-do item and return it. */
    addTodo(text: string): Todo;
    /** Reverse a string — a trivial example service. */
    shout(text: string): string;
  }
  /** Slots available in the demo app: "toolbar" | "sidebar" | "content" | "statusbar". */
  export type DemoSlot = "toolbar" | "sidebar" | "content" | "statusbar";
}
`;
