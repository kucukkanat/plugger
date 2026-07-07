import type { monaco as Monaco } from "./monaco";

/**
 * A shim module exposing the runtime bits of `@plugger/core` that survive
 * TypeScript's type erasure. `definePlugin` is an identity function, so the
 * shim can be a tiny static blob — no bundling of the real package needed.
 */
const CORE_SHIM = `export const definePlugin = (d) => d;
export const createStore = (s) => s;
export default { definePlugin };`;

let shimUrl: string | null = null;
function getShimUrl(): string {
  if (!shimUrl) {
    shimUrl = URL.createObjectURL(new Blob([CORE_SHIM], { type: "text/javascript" }));
  }
  return shimUrl;
}

export interface CompileResult {
  js: string;
  diagnostics: string[];
}

/**
 * Compile a TypeScript model to JavaScript using Monaco's bundled TypeScript
 * worker — entirely in the browser, no server round-trip. Also collects
 * semantic + syntactic diagnostics so the playground can block a broken run.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Monaco registers its TypeScript worker lazily, a beat after the first TS
 * model exists. Calling too early throws "TypeScript not registered!", so we
 * retry until the language service is up.
 */
async function acquireWorker(
  monaco: typeof Monaco,
  uri: Monaco.Uri,
  tries = 50,
): Promise<Monaco.languages.typescript.TypeScriptWorker> {
  let lastError: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
      return await getWorker(uri);
    } catch (error) {
      lastError = error;
      await sleep(80);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("TypeScript worker failed to initialise.");
}

export async function compileModel(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
): Promise<CompileResult> {
  const worker = await acquireWorker(monaco, model.uri);
  const uri = model.uri.toString();

  const [syntactic, semantic, output] = await Promise.all([
    worker.getSyntacticDiagnostics(uri),
    worker.getSemanticDiagnostics(uri),
    worker.getEmitOutput(uri),
  ]);

  const diagnostics = [...syntactic, ...semantic]
    // Ignore "cannot find module" for URL imports the author may add at runtime.
    .filter((d) => d.code !== 2307)
    .map((d) => flattenMessage(d.messageText));

  const jsFile = output.outputFiles.find((f) => f.name.endsWith(".js"));
  return { js: jsFile?.text ?? "", diagnostics };
}

function flattenMessage(
  message: string | { messageText: string; next?: unknown[] },
): string {
  if (typeof message === "string") return message;
  return message.messageText;
}

/**
 * Turn compiled plugin JS into an importable ES module by rewriting the
 * `@plugger/core` import to the runtime shim and wrapping it in a blob URL.
 */
export function toModuleUrl(js: string): string {
  const rewritten = js.replace(
    /(["'])@plugger\/core\1/g,
    JSON.stringify(getShimUrl()),
  );
  return URL.createObjectURL(new Blob([rewritten], { type: "text/javascript" }));
}

/** Compile + evaluate, returning the module's exports. */
export async function evaluateModel(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
): Promise<{ module: Record<string, unknown>; diagnostics: string[] }> {
  const { js, diagnostics } = await compileModel(monaco, model);
  const url = toModuleUrl(js);
  try {
    const module = (await import(/* @vite-ignore */ url)) as Record<string, unknown>;
    return { module, diagnostics };
  } finally {
    // Revoke on next tick so the import has fully resolved.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
