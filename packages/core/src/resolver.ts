import type {
  CdnProvider,
  GitSource,
  ModuleSource,
  NpmSource,
  PluginSource,
  StructuredSource,
  UrlSource,
} from "./types.js";

export class SourceError extends Error {
  override name = "SourceError";
}

const GITHUB_SHORTHAND = /^(?:github|gh):([^/\s]+)\/([^@#\s]+)(?:@([^#\s]+))?$/;
const GITHUB_URL = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:\/tree\/([^/\s]+))?\/?$/;
// name, @scope/name, optional subpath, optional @version. Version may itself
// contain the `@` (e.g. `@scope/name@1.2.3`) which is handled below.
const NPM_SPEC = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(\/[^@\s]+)?(?:@[^\s]+)?$/i;

/**
 * Classify a shorthand string or normalise a structured source into a
 * {@link StructuredSource}. Pure and synchronous.
 */
export function normalizeSource(source: PluginSource): StructuredSource {
  if (typeof source !== "string") return source;
  const raw = source.trim();
  if (!raw) throw new SourceError("Plugin source is empty.");

  // 1. Absolute URLs and root/relative paths → direct module URL.
  if (
    /^https?:\/\//i.test(raw) ||
    raw.startsWith("/") ||
    raw.startsWith("./") ||
    raw.startsWith("../") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    const gh = raw.match(GITHUB_URL);
    if (gh) {
      return { type: "git", repo: `${gh[1]}/${gh[2]}`, ref: gh[3] };
    }
    return { type: "url", url: raw };
  }

  // 2. GitHub shorthand → git source.
  const shorthand = raw.match(GITHUB_SHORTHAND);
  if (shorthand) {
    return { type: "git", repo: `${shorthand[1]}/${shorthand[2]}`, ref: shorthand[3] };
  }

  // 3. Otherwise treat as an npm spec.
  if (NPM_SPEC.test(raw)) {
    return parseNpmSpec(raw);
  }

  throw new SourceError(`Could not classify plugin source: "${raw}"`);
}

/** Parse `@scope/name/subpath@version` into an {@link NpmSource}. */
export function parseNpmSpec(spec: string): NpmSource {
  let rest = spec;
  let scope = "";
  if (rest.startsWith("@")) {
    const slash = rest.indexOf("/");
    if (slash === -1) throw new SourceError(`Invalid scoped package: "${spec}"`);
    scope = rest.slice(0, slash + 1);
    rest = rest.slice(slash + 1);
  }
  // The remaining `rest` is `name[/subpath][@version]`.
  const at = rest.indexOf("@");
  let version: string | undefined;
  if (at !== -1) {
    version = rest.slice(at + 1);
    rest = rest.slice(0, at);
  }
  return { type: "npm", name: scope + rest, ...(version ? { version } : {}) };
}

const CDN_BASES: Record<CdnProvider, string> = {
  "esm.sh": "https://esm.sh",
  jsdelivr: "https://cdn.jsdelivr.net",
  skypack: "https://cdn.skypack.dev",
  unpkg: "https://unpkg.com",
};

/**
 * Resolve a {@link StructuredSource} into a concrete ES module URL.
 *
 * `module` sources have no URL and return `null` (the loader handles them
 * directly). `url` sources pass through. `npm`/`git` sources are mapped onto the
 * chosen CDN's URL scheme.
 */
export function resolveModuleUrl(
  source: StructuredSource,
  defaultCdn: CdnProvider = "esm.sh",
): string | null {
  switch (source.type) {
    case "module":
      return null;
    case "url":
      return source.url;
    case "npm":
      return resolveNpm(source, source.cdn ?? defaultCdn);
    case "git":
      return resolveGit(source, source.cdn ?? defaultCdn);
    default: {
      const _exhaustive: never = source;
      throw new SourceError(
        `Unknown source type: ${(_exhaustive as StructuredSource).type}`,
      );
    }
  }
}

function resolveNpm(source: NpmSource, cdn: CdnProvider): string {
  const base = CDN_BASES[cdn];
  const versioned = source.version ? `${source.name}@${source.version}` : source.name;
  switch (cdn) {
    case "jsdelivr":
      // jsdelivr needs an explicit `/+esm` to serve an ES module bundle.
      return `${base}/npm/${versioned}/+esm`;
    case "esm.sh":
    case "skypack":
    case "unpkg":
    default:
      return `${base}/${versioned}`;
  }
}

function resolveGit(source: GitSource, cdn: CdnProvider): string {
  const base = CDN_BASES[cdn];
  const ref = source.ref ? `@${source.ref}` : "";
  const path = source.path ? `/${source.path.replace(/^\//, "")}` : "";
  switch (cdn) {
    case "jsdelivr":
      return `${base}/gh/${source.repo}${ref}${path || "/+esm"}`;
    case "esm.sh":
    default:
      // esm.sh understands `gh/owner/repo@ref`.
      return `${base}/gh/${source.repo}${ref}${path}`;
  }
}

/** Narrowing helpers, handy for adapters and diagnostics. */
export const isUrlSource = (s: StructuredSource): s is UrlSource => s.type === "url";
export const isNpmSource = (s: StructuredSource): s is NpmSource => s.type === "npm";
export const isGitSource = (s: StructuredSource): s is GitSource => s.type === "git";
export const isModuleSource = (s: StructuredSource): s is ModuleSource =>
  s.type === "module";

/** Human-readable label for a source, for logs and UI. */
export function describeSource(source: StructuredSource): string {
  switch (source.type) {
    case "url":
      return source.url;
    case "npm":
      return `npm:${source.name}${source.version ? `@${source.version}` : ""}`;
    case "git":
      return `git:${source.repo}${source.ref ? `@${source.ref}` : ""}`;
    case "module":
      return "module:<in-memory>";
  }
}
