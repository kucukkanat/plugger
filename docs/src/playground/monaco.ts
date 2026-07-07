import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { demoHostDts, pluggerCoreDts } from "./pluggerTypes";

let configured = false;

/**
 * Configure Monaco once: register web workers, tune the TypeScript language
 * service for playground use, and inject the Plugger + demo-host ambient types
 * so authors get real autocomplete and inline error diagnostics.
 */
export function configureMonaco(): typeof monaco {
  if (configured) return monaco;
  configured = true;

  self.MonacoEnvironment = {
    getWorker(_workerId, label) {
      if (label === "typescript" || label === "javascript") return new tsWorker();
      return new editorWorker();
    },
  };

  const ts = monaco.languages.typescript;
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    lib: ["es2020", "dom", "dom.iterable"],
    strict: true,
    noImplicitAny: false,
    jsx: ts.JsxEmit.React,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    skipLibCheck: true,
  });

  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    // 2792: cannot find module (we resolve @plugger/core via extraLib module aug)
    diagnosticCodesToIgnore: [],
  });

  ts.typescriptDefaults.addExtraLib(
    pluggerCoreDts,
    "file:///node_modules/@plugger/core/index.d.ts",
  );
  ts.typescriptDefaults.addExtraLib(
    demoHostDts,
    "file:///node_modules/@demo/host/index.d.ts",
  );

  defineThemes();
  return monaco;
}

function defineThemes(): void {
  monaco.editor.defineTheme("plugger-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b6f7e", fontStyle: "italic" },
      { token: "keyword", foreground: "d9b8ff" },
      { token: "string", foreground: "7ee787" },
      { token: "number", foreground: "f0b072" },
      { token: "type", foreground: "79c0ff" },
      { token: "identifier", foreground: "edeef2" },
    ],
    colors: {
      "editor.background": "#0e0f16",
      "editor.foreground": "#edeef2",
      "editorLineNumber.foreground": "#3a3d4a",
      "editorLineNumber.activeForeground": "#8a8f9c",
      "editor.selectionBackground": "#2a2660",
      "editor.lineHighlightBackground": "#16171f",
      "editorCursor.foreground": "#a99bff",
      "editorIndentGuide.background1": "#1e1f28",
      "editorWidget.background": "#14151d",
      "editorWidget.border": "#23252f",
      "editorSuggestWidget.background": "#14151d",
      "editorSuggestWidget.selectedBackground": "#232460",
    },
  });

  monaco.editor.defineTheme("plugger-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a8f9c", fontStyle: "italic" },
      { token: "keyword", foreground: "8b2fd6" },
      { token: "string", foreground: "16a34a" },
      { token: "number", foreground: "d97706" },
    ],
    colors: {
      "editor.background": "#f6f7f9",
      "editor.foreground": "#1a1b25",
      "editorLineNumber.foreground": "#c3c6d0",
      "editor.lineHighlightBackground": "#eceef2",
      "editorCursor.foreground": "#6d5efc",
    },
  });
}

export { monaco };
