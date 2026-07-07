import { createEventBus, namespacedBus } from "./events.js";
import { loadPluginModule } from "./loader.js";
import { PermissionSet, resolvePermissions } from "./permissions.js";
import { CommandRegistry, UIRegistry } from "./registry.js";
import { describeSource, normalizeSource } from "./resolver.js";
import { createStore } from "./store.js";
import { createPluginStorage, defaultStorage } from "./storage.js";
import type {
  Disposable,
  EventBus,
  Logger,
  LoadOptions,
  Permission,
  PluginContext,
  PluginDefinition,
  PluginHostOptions,
  PluginRecord,
  PluginSource,
  PluginStatus,
  ScopedStore,
  Store,
  StructuredSource,
  UIContribution,
  Unsubscribe,
} from "./types.js";

const isDisposable = (v: unknown): v is Disposable =>
  typeof v === "object" && v !== null && typeof (v as Disposable).dispose === "function";

/** Collects per-plugin disposables so activation side effects can be undone. */
class SubscriptionBag {
  private readonly items: Array<Disposable | Unsubscribe> = [];
  private disposed = false;

  add(item: Disposable | Unsubscribe): void {
    if (this.disposed) {
      // Registering after teardown: dispose immediately to avoid leaks.
      this.run(item);
      return;
    }
    this.items.push(item);
  }

  disposeAll(logger: Logger): void {
    this.disposed = true;
    // Dispose in reverse registration order (LIFO), like a stack unwind.
    for (const item of this.items.reverse()) {
      try {
        this.run(item);
      } catch (error) {
        logger.warn("[plugger] error while disposing a subscription:", error);
      }
    }
    this.items.length = 0;
  }

  private run(item: Disposable | Unsubscribe): void {
    if (isDisposable(item)) item.dispose();
    else item();
  }
}

/**
 * The Plugger host — the object an application author creates to make their SPA
 * extensible. It owns shared state, exposed services, the command & UI
 * registries, and the plugin lifecycle.
 */
export class PluginHost<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
> {
  readonly store: Store<S>;
  readonly api: API;
  readonly events: EventBus = createEventBus();
  readonly commands = new CommandRegistry();
  readonly ui: UIRegistry;

  private readonly records = new Map<string, PluginRecord>();
  private readonly permissionSets = new Map<string, PermissionSet>();
  private readonly contexts = new Map<string, PluginContext<API, S>>();
  private readonly bags = new Map<string, SubscriptionBag>();
  private readonly options: Required<
    Pick<PluginHostOptions<API, S>, "cdn" | "autoActivate">
  > &
    PluginHostOptions<API, S>;
  private readonly logger: Logger;

  constructor(options: PluginHostOptions<API, S> = {}) {
    this.options = {
      cdn: options.cdn ?? "esm.sh",
      autoActivate: options.autoActivate ?? true,
      ...options,
    };
    this.logger = options.logger ?? console;
    this.store = isStore<S>(options.state)
      ? options.state
      : createStore<S>((options.state ?? {}) as S);
    this.api = options.api ?? ({} as API);
    this.ui = new UIRegistry(options.slots ?? []);
  }

  /* --------------------------- registration ---------------------------- */

  /**
   * Register an in-memory plugin definition (first-party / local plugins).
   * Equivalent to loading a `{ type: "module" }` source.
   */
  use(definition: PluginDefinition<API, S>, options: LoadOptions = {}): Promise<PluginRecord> {
    return this.load(
      { type: "module", module: { default: definition as PluginDefinition } },
      options,
    );
  }

  /**
   * Resolve, import and register a plugin from any {@link PluginSource}. When
   * `autoActivate` is on (the default), the plugin is activated before the
   * returned promise resolves.
   */
  async load(source: PluginSource, options: LoadOptions = {}): Promise<PluginRecord> {
    const structured = normalizeSource(source);
    const definition = await loadPluginModule(structured, {
      importer: this.options.importer,
      cdn: this.options.cdn,
    });

    if (this.records.has(definition.name)) {
      throw new Error(
        `A plugin named "${definition.name}" is already registered ` +
          `(from ${describeSource(this.records.get(definition.name)!.source)}).`,
      );
    }

    const permissions = await resolvePermissions(
      definition.name,
      definition.permissions ?? [],
      options.permissions ?? [],
      this.options.permissions,
    );
    this.permissionSets.set(definition.name, permissions);

    const record: PluginRecord = {
      name: definition.name,
      definition,
      source: structured,
      permissions: permissions.list(),
      status: "loaded",
    };
    this.records.set(definition.name, record);
    this.emit("plugin:loaded", { name: definition.name });

    const shouldActivate = options.activate ?? this.options.autoActivate;
    if (shouldActivate) await this.activate(definition.name);
    return record;
  }

  /* ---------------------------- lifecycle ------------------------------ */

  async activate(name: string): Promise<void> {
    const record = this.requireRecord(name);
    if (record.status === "active" || record.status === "activating") return;

    // Activate declared dependencies first.
    for (const dep of record.definition.dependencies ?? []) {
      if (!this.records.has(dep)) {
        throw new Error(`Plugin "${name}" depends on "${dep}", which is not loaded.`);
      }
      await this.activate(dep);
    }

    record.status = "activating";
    const permissions = this.permissionSets.get(name)!;
    const bag = new SubscriptionBag();
    this.bags.set(name, bag);
    const context = this.createContext(record.definition, permissions, bag);
    this.contexts.set(name, context);

    try {
      await (record.definition as PluginDefinition<API, S>).activate?.(context);
      record.status = "active";
      record.error = undefined;
      this.emit("plugin:activated", { name });
    } catch (error) {
      record.status = "error";
      record.error = error as Error;
      bag.disposeAll(this.logger);
      this.commands.removeOwner(name);
      this.ui.removeOwner(name);
      this.emit("plugin:error", { name, error: error as Error });
      throw error;
    }
  }

  async deactivate(name: string): Promise<void> {
    const record = this.requireRecord(name);
    if (record.status !== "active" && record.status !== "error") return;

    record.status = "deactivating";
    const context = this.contexts.get(name);
    try {
      if (context) {
        await (record.definition as PluginDefinition<API, S>).deactivate?.(context);
      }
    } catch (error) {
      this.logger.warn(`[plugger] "${name}" threw during deactivate:`, error);
    } finally {
      this.bags.get(name)?.disposeAll(this.logger);
      this.commands.removeOwner(name);
      this.ui.removeOwner(name);
      this.bags.delete(name);
      this.contexts.delete(name);
      record.status = "inactive";
      this.emit("plugin:deactivated", { name });
    }
  }

  /** Deactivate (if needed) and remove a plugin from the host entirely. */
  async remove(name: string): Promise<void> {
    if (!this.records.has(name)) return;
    await this.deactivate(name);
    this.records.delete(name);
    this.permissionSets.delete(name);
    this.emit("plugin:removed", { name });
  }

  /** Deactivate and remove every plugin. */
  async destroy(): Promise<void> {
    for (const name of [...this.records.keys()].reverse()) {
      await this.remove(name);
    }
  }

  /* ----------------------------- queries ------------------------------- */

  get(name: string): PluginRecord | undefined {
    return this.records.get(name);
  }

  list(): PluginRecord[] {
    return [...this.records.values()];
  }

  status(name: string): PluginStatus | undefined {
    return this.records.get(name)?.status;
  }

  has(name: string): boolean {
    return this.records.has(name);
  }

  permissionsOf(name: string): Permission[] {
    return this.permissionSets.get(name)?.list() ?? [];
  }

  /* -------------------------- UI convenience --------------------------- */

  /** All contributions for a slot, in render order. */
  getSlot(slot: string): UIContribution[] {
    return this.ui.get(slot);
  }

  /** Subscribe to changes in a specific slot (or all slots when omitted). */
  onSlotChange(listener: (slot: string) => void, slot?: string): Unsubscribe {
    return this.ui.onChange((changed) => {
      if (slot == null || changed === slot) listener(changed);
    });
  }

  /* ------------------------------ events ------------------------------- */

  on(event: string, handler: (payload: unknown) => void): Unsubscribe {
    return this.events.on(event, handler);
  }

  private emit(event: string, payload: unknown): void {
    this.events.emit(event, payload);
  }

  /* --------------------------- context build --------------------------- */

  private createContext(
    definition: PluginDefinition,
    permissions: PermissionSet,
    bag: SubscriptionBag,
  ): PluginContext<API, S> {
    const name = definition.name;
    const storageBackend = this.options.storage ?? defaultStorage();

    const scopedStore: ScopedStore<S> = {
      getState: () => {
        permissions.assert("state:read");
        return this.store.getState();
      },
      setState: (patch) => {
        permissions.assert("state:write");
        this.store.setState(patch);
      },
      subscribe: (listener) => {
        permissions.assert("state:read");
        const unsub = this.store.subscribe(listener);
        bag.add(unsub);
        return unsub;
      },
      select: (selector, listener, opts) => {
        permissions.assert("state:read");
        const unsub = this.store.select(selector, listener, opts);
        bag.add(unsub);
        return unsub;
      },
    };

    const rawBus = namespacedBus(this.events, `plugin:${name}`);
    const scopedEvents: EventBus = {
      on: (event, handler) => {
        permissions.assert("events:listen");
        const unsub = rawBus.on(event, handler);
        bag.add(unsub);
        return unsub;
      },
      once: (event, handler) => {
        permissions.assert("events:listen");
        const unsub = rawBus.once(event, handler);
        bag.add(unsub);
        return unsub;
      },
      off: (event, handler) => rawBus.off(event, handler),
      emit: (event, payload) => {
        permissions.assert("events:emit");
        rawBus.emit(event, payload);
      },
    };

    const apiProxy = this.createApiProxy(permissions);

    const context: PluginContext<API, S> = {
      meta: Object.freeze({ ...definition }),
      store: scopedStore,
      api: apiProxy,
      events: scopedEvents,
      logger: prefixedLogger(this.logger, name),
      storage: gatedStorage(createPluginStorage(storageBackend, name), permissions),
      commands: {
        register: (command) => {
          permissions.assert("commands:register");
          const disposable = this.commands.register(
            command as Parameters<CommandRegistry["register"]>[0],
            name,
          );
          bag.add(disposable);
          return disposable;
        },
        execute: (id, ...args) => {
          permissions.assert("commands:execute");
          return this.commands.execute(id, ...args);
        },
        has: (id) => this.commands.has(id),
        list: () => this.commands.list(),
      },
      ui: {
        contribute: (slot, spec) => {
          permissions.assert("ui:render");
          this.ui.declareSlot(slot);
          const disposable = this.ui.contribute(slot, spec, name);
          bag.add(disposable);
          return disposable;
        },
        slots: () => this.ui.slotNames(),
      },
      subscribe: (disposable) => bag.add(disposable),
      hasPermission: (permission) => permissions.has(permission),
    };
    return context;
  }

  /**
   * Wrap the exposed API so each accessed method requires either `api:*` or the
   * specific `api:<name>` permission.
   */
  private createApiProxy(permissions: PermissionSet): API {
    const api = this.api;
    return new Proxy(api, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          permissions.assert(`api:${prop}` as Permission);
        }
        const value = Reflect.get(target, prop, receiver);
        // Preserve `this` binding for methods.
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  private requireRecord(name: string): PluginRecord {
    const record = this.records.get(name);
    if (!record) throw new Error(`No plugin named "${name}" is registered.`);
    return record;
  }
}

/** Create a host. Thin factory over {@link PluginHost} for a friendlier API. */
export function createPluginHost<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
>(options: PluginHostOptions<API, S> = {}): PluginHost<API, S> {
  return new PluginHost<API, S>(options);
}

/* ------------------------------ helpers -------------------------------- */

function isStore<S extends object>(value: unknown): value is Store<S> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Store<S>).getState === "function" &&
    typeof (value as Store<S>).setState === "function" &&
    typeof (value as Store<S>).subscribe === "function"
  );
}

function prefixedLogger(logger: Logger, name: string): Logger {
  const tag = `[plugin:${name}]`;
  return {
    debug: (...a) => logger.debug(tag, ...a),
    info: (...a) => logger.info(tag, ...a),
    warn: (...a) => logger.warn(tag, ...a),
    error: (...a) => logger.error(tag, ...a),
  };
}

function gatedStorage(
  storage: PluginContext["storage"],
  permissions: PermissionSet,
): PluginContext["storage"] {
  return {
    get: (key) => {
      permissions.assert("storage");
      return storage.get(key);
    },
    set: (key, value) => {
      permissions.assert("storage");
      storage.set(key, value);
    },
    remove: (key) => {
      permissions.assert("storage");
      storage.remove(key);
    },
    keys: () => {
      permissions.assert("storage");
      return storage.keys();
    },
    clear: () => {
      permissions.assert("storage");
      storage.clear();
    },
  };
}
