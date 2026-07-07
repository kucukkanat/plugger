import { describe, expect, it, vi } from "vitest";
import {
  extractDefinition,
  loadPluginModule,
  LoadError,
} from "../src/loader.js";
import type { PluginModule, StructuredSource } from "../src/types.js";

const src: StructuredSource = { type: "url", url: "https://x/p.js" };

describe("loadPluginModule", () => {
  it("loads from an in-memory module source without an importer", async () => {
    const def = await loadPluginModule({
      type: "module",
      module: { default: { name: "mem" } },
    });
    expect(def.name).toBe("mem");
  });

  it("uses the injected importer for url sources", async () => {
    const importer = vi.fn(async (): Promise<PluginModule> => ({
      default: { name: "remote", version: "1.0.0" },
    }));
    const def = await loadPluginModule(src, { importer });
    expect(importer).toHaveBeenCalledWith("https://x/p.js");
    expect(def.name).toBe("remote");
  });

  it("resolves npm sources to a CDN URL before importing", async () => {
    const importer = vi.fn(async (): Promise<PluginModule> => ({
      default: { name: "n" },
    }));
    await loadPluginModule({ type: "npm", name: "pkg", version: "1.0.0" }, { importer });
    expect(importer).toHaveBeenCalledWith("https://esm.sh/pkg@1.0.0");
  });

  it("wraps import failures in a LoadError", async () => {
    const importer = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(loadPluginModule(src, { importer })).rejects.toBeInstanceOf(LoadError);
  });

  it("supports the `plugin` named export", async () => {
    const def = await extractDefinition({ plugin: { name: "named" } }, src);
    expect(def.name).toBe("named");
  });

  it("supports a factory default export", async () => {
    const def = await extractDefinition({ default: () => ({ name: "factory" }) }, src);
    expect(def.name).toBe("factory");
  });

  it("supports an async factory default export", async () => {
    const def = await extractDefinition(
      { default: async () => ({ name: "async-factory" }) },
      src,
    );
    expect(def.name).toBe("async-factory");
  });

  it("throws when the module exports no definition", async () => {
    await expect(extractDefinition({}, src)).rejects.toBeInstanceOf(LoadError);
  });

  it("throws when the definition has no name", async () => {
    await expect(
      extractDefinition({ default: { version: "1" } as never }, src),
    ).rejects.toThrow(/missing a `name`/);
  });

  it("throws when activate is not a function", async () => {
    await expect(
      extractDefinition({ default: { name: "x", activate: 5 as never } }, src),
    ).rejects.toThrow(/activate/);
  });

  it("propagates errors thrown by a factory as LoadError", async () => {
    await expect(
      extractDefinition(
        {
          default: () => {
            throw new Error("boom");
          },
        },
        src,
      ),
    ).rejects.toBeInstanceOf(LoadError);
  });
});
