import { describeSource, resolveModuleUrl } from "./resolver.js";
import type {
  CdnProvider,
  ModuleImporter,
  PluginDefinition,
  PluginModule,
  StructuredSource,
} from "./types.js";

export class LoadError extends Error {
  override name = "LoadError";
  constructor(
    message: string,
    public readonly source: StructuredSource,
    public readonly reason?: unknown,
  ) {
    super(message);
  }
}

/**
 * The default importer uses native dynamic `import`. The indirection through a
 * variable and the `/* @vite-ignore *\/` hint keep bundlers from trying to
 * statically analyse (and thus break) the runtime URL — Plugger loads plugins
 * purely at runtime, with no bundling or transpilation of the host app.
 */
export const nativeImporter: ModuleImporter = (url: string) =>
  import(/* @vite-ignore */ /* webpackIgnore: true */ url) as Promise<PluginModule>;

/**
 * Load a plugin module from a structured source and extract its definition.
 *
 * The plugin definition is looked up, in order, from:
 *  - `module.default` (a definition, or a factory returning one)
 *  - `module.plugin`
 */
export async function loadPluginModule(
  source: StructuredSource,
  options: { importer?: ModuleImporter; cdn?: CdnProvider } = {},
): Promise<PluginDefinition> {
  const importer = options.importer ?? nativeImporter;

  let module: PluginModule;
  if (source.type === "module") {
    module = source.module;
  } else {
    const url = resolveModuleUrl(source, options.cdn);
    if (!url) {
      throw new LoadError(
        `Could not resolve a module URL for ${describeSource(source)}.`,
        source,
      );
    }
    try {
      module = await importer(url);
    } catch (cause) {
      throw new LoadError(
        `Failed to import plugin from ${url}: ${errorMessage(cause)}`,
        source,
        cause,
      );
    }
  }

  return extractDefinition(module, source);
}

export async function extractDefinition(
  module: PluginModule,
  source: StructuredSource,
): Promise<PluginDefinition> {
  let candidate: unknown = module.default ?? module.plugin;

  // Support factory functions: `export default () => definePlugin({...})`.
  if (typeof candidate === "function") {
    try {
      candidate = await (candidate as () => unknown)();
    } catch (cause) {
      throw new LoadError(
        `Plugin factory threw while producing a definition: ${errorMessage(cause)}`,
        source,
        cause,
      );
    }
  }

  assertValidDefinition(candidate, source);
  return candidate;
}

function assertValidDefinition(
  value: unknown,
  source: StructuredSource,
): asserts value is PluginDefinition {
  if (!value || typeof value !== "object") {
    throw new LoadError(
      `Plugin module from ${describeSource(source)} did not export a plugin ` +
        `definition (expected a \`default\` or \`plugin\` export created with ` +
        `\`definePlugin\`).`,
      source,
    );
  }
  const def = value as Partial<PluginDefinition>;
  if (typeof def.name !== "string" || def.name.length === 0) {
    throw new LoadError(
      `Plugin definition from ${describeSource(source)} is missing a \`name\`.`,
      source,
    );
  }
  if (def.activate != null && typeof def.activate !== "function") {
    throw new LoadError(
      `Plugin "${def.name}" has an \`activate\` that is not a function.`,
      source,
    );
  }
  if (def.deactivate != null && typeof def.deactivate !== "function") {
    throw new LoadError(
      `Plugin "${def.name}" has a \`deactivate\` that is not a function.`,
      source,
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
