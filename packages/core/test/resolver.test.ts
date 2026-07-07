import { describe, expect, it } from "vitest";
import {
  describeSource,
  isGitSource,
  isNpmSource,
  isUrlSource,
  normalizeSource,
  parseNpmSpec,
  resolveModuleUrl,
  SourceError,
} from "../src/resolver.js";

describe("normalizeSource", () => {
  it("classifies absolute https URLs", () => {
    const s = normalizeSource("https://example.com/plugin.mjs");
    expect(s).toEqual({ type: "url", url: "https://example.com/plugin.mjs" });
    expect(isUrlSource(s)).toBe(true);
  });

  it("classifies root and relative paths as URLs", () => {
    expect(normalizeSource("/local/p.js")).toEqual({ type: "url", url: "/local/p.js" });
    expect(normalizeSource("./p.js")).toEqual({ type: "url", url: "./p.js" });
    expect(normalizeSource("../p.js")).toEqual({ type: "url", url: "../p.js" });
  });

  it("classifies blob and data URLs", () => {
    expect(normalizeSource("blob:https://x/y").type).toBe("url");
    expect(normalizeSource("data:text/javascript,export default 1").type).toBe("url");
  });

  it("classifies github: shorthand with a ref", () => {
    const s = normalizeSource("github:acme/widgets@v2");
    expect(s).toEqual({ type: "git", repo: "acme/widgets", ref: "v2" });
    expect(isGitSource(s)).toBe(true);
  });

  it("classifies gh: shorthand without a ref", () => {
    expect(normalizeSource("gh:acme/widgets")).toEqual({
      type: "git",
      repo: "acme/widgets",
      ref: undefined,
    });
  });

  it("classifies a github.com URL including tree ref", () => {
    expect(normalizeSource("https://github.com/acme/widgets/tree/main")).toEqual({
      type: "git",
      repo: "acme/widgets",
      ref: "main",
    });
    expect(normalizeSource("https://github.com/acme/widgets.git")).toEqual({
      type: "git",
      repo: "acme/widgets",
      ref: undefined,
    });
  });

  it("classifies a bare npm package", () => {
    const s = normalizeSource("lodash-es");
    expect(s).toEqual({ type: "npm", name: "lodash-es" });
    expect(isNpmSource(s)).toBe(true);
  });

  it("classifies a scoped npm package with version", () => {
    expect(normalizeSource("@acme/plugin@1.2.3")).toEqual({
      type: "npm",
      name: "@acme/plugin",
      version: "1.2.3",
    });
  });

  it("classifies an npm package with a subpath", () => {
    expect(normalizeSource("@acme/plugin/dist/index.js")).toEqual({
      type: "npm",
      name: "@acme/plugin/dist/index.js",
    });
  });

  it("passes structured sources through unchanged", () => {
    const src = { type: "npm", name: "x" } as const;
    expect(normalizeSource(src)).toBe(src);
  });

  it("throws on empty input", () => {
    expect(() => normalizeSource("   ")).toThrow(SourceError);
  });
});

describe("parseNpmSpec", () => {
  it("parses name only", () => {
    expect(parseNpmSpec("react")).toEqual({ type: "npm", name: "react" });
  });
  it("parses name@version", () => {
    expect(parseNpmSpec("react@18.3.1")).toEqual({
      type: "npm",
      name: "react",
      version: "18.3.1",
    });
  });
  it("parses scoped name@version", () => {
    expect(parseNpmSpec("@scope/pkg@2.0.0")).toEqual({
      type: "npm",
      name: "@scope/pkg",
      version: "2.0.0",
    });
  });
  it("throws on a bare @ with no slash", () => {
    expect(() => parseNpmSpec("@nope")).toThrow(SourceError);
  });
});

describe("resolveModuleUrl", () => {
  it("returns null for module sources", () => {
    expect(
      resolveModuleUrl({ type: "module", module: { default: { name: "x" } } }),
    ).toBeNull();
  });

  it("returns the url for url sources", () => {
    expect(resolveModuleUrl({ type: "url", url: "https://x/y.js" })).toBe("https://x/y.js");
  });

  it("resolves npm via esm.sh by default", () => {
    expect(resolveModuleUrl({ type: "npm", name: "lodash", version: "4.17.21" })).toBe(
      "https://esm.sh/lodash@4.17.21",
    );
  });

  it("resolves npm without a version", () => {
    expect(resolveModuleUrl({ type: "npm", name: "lodash" })).toBe("https://esm.sh/lodash");
  });

  it("resolves npm via jsdelivr with +esm", () => {
    expect(
      resolveModuleUrl({ type: "npm", name: "lodash", version: "4.17.21", cdn: "jsdelivr" }),
    ).toBe("https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm");
  });

  it("resolves npm via unpkg and skypack", () => {
    expect(resolveModuleUrl({ type: "npm", name: "x" }, "unpkg")).toBe("https://unpkg.com/x");
    expect(resolveModuleUrl({ type: "npm", name: "x" }, "skypack")).toBe(
      "https://cdn.skypack.dev/x",
    );
  });

  it("resolves git via esm.sh gh scheme", () => {
    expect(resolveModuleUrl({ type: "git", repo: "acme/widgets", ref: "v2" })).toBe(
      "https://esm.sh/gh/acme/widgets@v2",
    );
  });

  it("resolves git with a path", () => {
    expect(
      resolveModuleUrl({ type: "git", repo: "acme/widgets", path: "dist/index.mjs" }),
    ).toBe("https://esm.sh/gh/acme/widgets/dist/index.mjs");
  });

  it("resolves git via jsdelivr", () => {
    expect(
      resolveModuleUrl({ type: "git", repo: "acme/widgets", ref: "main", cdn: "jsdelivr" }),
    ).toBe("https://cdn.jsdelivr.net/gh/acme/widgets@main/+esm");
  });
});

describe("describeSource", () => {
  it("produces human labels", () => {
    expect(describeSource({ type: "url", url: "u" })).toBe("u");
    expect(describeSource({ type: "npm", name: "n", version: "1" })).toBe("npm:n@1");
    expect(describeSource({ type: "git", repo: "a/b", ref: "c" })).toBe("git:a/b@c");
    expect(
      describeSource({ type: "module", module: { default: { name: "x" } } }),
    ).toBe("module:<in-memory>");
  });
});
