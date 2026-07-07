import type { PluginDefinition } from "./types.js";

/**
 * Identity helper for authoring plugins with full type inference.
 *
 * Pass the host's API and state types as generics (or via a typed
 * `HostContract`) to get autocomplete and type-checking for `context.api`,
 * `context.store`, commands and everything else:
 *
 * ```ts
 * import { definePlugin } from "@plugger/core";
 *
 * export default definePlugin<MyApi, MyState>({
 *   name: "hello-world",
 *   version: "1.0.0",
 *   permissions: ["ui:render", "state:read"],
 *   activate(ctx) {
 *     ctx.ui.contribute("toolbar", {
 *       mount(el) {
 *         el.textContent = `Hello, ${ctx.store.getState().user}!`;
 *       },
 *     });
 *   },
 * });
 * ```
 */
export function definePlugin<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
>(definition: PluginDefinition<API, S>): PluginDefinition<API, S> {
  return definition;
}

/**
 * Describe a host contract (API + state shape) once and reuse it to author
 * strongly-typed plugins. Application authors publish a `HostContract`-typed
 * package so plugin developers get end-to-end types.
 */
export interface HostContract<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
> {
  api: API;
  state: S;
}

/** Convenience alias mirroring `definePlugin` but keyed off a contract type. */
export type PluginFor<C extends HostContract> = PluginDefinition<C["api"], C["state"]>;
