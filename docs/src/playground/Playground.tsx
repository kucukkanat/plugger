import { useCallback, useEffect, useRef, useState } from "react";
import { renderSlot, type SlotHandle } from "@plugger/vanilla";
import type { PluginDefinition } from "@plugger/core";
import { useTheme } from "../theme";
import { Editor } from "./Editor";
import { evaluateModel } from "./compile";
import {
  createDemoHost,
  type DemoHost,
  type DemoState,
  type LogEntry,
} from "./demoHost";
import type { monaco as Monaco } from "./monaco";

let uid = 0;
const SLOTS = ["toolbar", "sidebar", "content", "statusbar"] as const;
type Slot = (typeof SLOTS)[number];

export interface PluginPlaygroundProps {
  code: string;
  title?: string;
  /** Run automatically once the editor is ready. Default true. */
  autoRun?: boolean;
  /** Layout variant. */
  variant?: "embedded" | "full";
}

export function Playground({
  code,
  title = "plugin.ts",
  autoRun = true,
  variant = "embedded",
}: PluginPlaygroundProps) {
  const { theme } = useTheme();
  const [path] = useState(() => `file:///pg-${uid++}.tsx`);
  const [source, setSource] = useState(code);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [state, setState] = useState<DemoState | null>(null);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"preview" | "console">("preview");

  const monacoApi = useRef<{
    editor: Monaco.editor.IStandaloneCodeEditor;
    monaco: typeof Monaco;
  } | null>(null);
  const demoRef = useRef<DemoHost | null>(null);
  const handles = useRef<SlotHandle[]>([]);
  const cleanups = useRef<Array<() => void>>([]);
  const slotEls = useRef<Record<Slot, HTMLDivElement | null>>({
    toolbar: null,
    sidebar: null,
    content: null,
    statusbar: null,
  });

  // Keep the latest source without re-registering onChange.
  useEffect(() => setSource(code), [code]);

  const teardown = useCallback(async () => {
    handles.current.forEach((h) => h.dispose());
    handles.current = [];
    cleanups.current.forEach((c) => c());
    cleanups.current = [];
    if (demoRef.current) {
      await demoRef.current.host.destroy();
      demoRef.current = null;
    }
  }, []);

  const run = useCallback(async () => {
    if (!monacoApi.current) return;
    setRunning(true);
    setError(null);
    setLogs([]);
    await teardown();

    const collected: LogEntry[] = [];
    const demo = createDemoHost((entry) => {
      collected.push(entry);
      setLogs([...collected]);
    });
    demoRef.current = demo;

    try {
      const { editor, monaco } = monacoApi.current;
      const model = editor.getModel();
      if (!model) throw new Error("Editor model unavailable.");
      const { module, diagnostics: diags } = await evaluateModel(monaco, model);
      setDiagnostics(diags);

      const plugin = (module.default ?? module.plugin) as PluginDefinition | undefined;
      if (!plugin || typeof plugin !== "object" || !("name" in plugin)) {
        throw new Error(
          "Your module must `export default definePlugin({ ... })` with a name.",
        );
      }

      await demo.host.use(plugin as Parameters<typeof demo.host.use>[0]);

      for (const slot of SLOTS) {
        const el = slotEls.current[slot];
        if (el) handles.current.push(renderSlot(demo.host, slot, el));
      }

      const updateCounts = () =>
        setSlotCounts(
          Object.fromEntries(SLOTS.map((s) => [s, demo.host.getSlot(s).length])),
        );
      updateCounts();
      cleanups.current.push(demo.host.onSlotChange(updateCounts));

      setState({ ...demo.host.store.getState() });
      cleanups.current.push(demo.host.store.subscribe((s) => setState({ ...s })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [teardown]);

  const handleReady = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
      monacoApi.current = { editor, monaco };
      // Cmd/Ctrl+Enter to run.
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => run());
      if (autoRun) void run();
    },
    [autoRun, run],
  );

  const reset = useCallback(() => {
    monacoApi.current?.editor.setValue(code);
    setSource(code);
    void run();
  }, [code, run]);

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  return (
    <div className={`playground ${variant}`}>
      <div className="pg-toolbar">
        <span className="title">
          <span className="emoji">🔌</span>
          {title}
        </span>
        <span className="spacer" />
        <div className="pg-tabs">
          <button
            className={`pg-tab ${tab === "preview" ? "active" : ""}`}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
          <button
            className={`pg-tab ${tab === "console" ? "active" : ""}`}
            onClick={() => setTab("console")}
          >
            Console{logs.length ? ` (${logs.length})` : ""}
          </button>
        </div>
        <button className="pg-btn" onClick={reset} title="Reset to original code">
          Reset
        </button>
        <button className="pg-run" onClick={() => run()} disabled={running}>
          {running ? "Running…" : "► Run"}
        </button>
      </div>

      <div className="pg-body">
        <div className="pg-editor">
          <Editor
            value={source}
            path={path}
            theme={theme}
            onChange={setSource}
            onReady={handleReady}
          />
        </div>

        <div className="pg-preview">
          {tab === "preview" ? (
            <>
              <div className="pg-preview-head">Live demo app</div>
              <DemoApp slotEls={slotEls} slotCounts={slotCounts} state={state} />
              {state && (
                <div className="pg-state">
                  <span className="k">state</span> = {"{"} title:{" "}
                  {JSON.stringify(state.title)}, words: {state.words}, unread:{" "}
                  {state.unread}, todos: {state.todos.length} {"}"}
                </div>
              )}
            </>
          ) : (
            <Console logs={logs} />
          )}
        </div>
      </div>

      {diagnostics.length > 0 && !error && (
        <div className="pg-error-banner" style={{ color: "#f59e0b" }}>
          {diagnostics.length} type warning{diagnostics.length > 1 ? "s" : ""}:{" "}
          {diagnostics[0]}
        </div>
      )}
      {error && <div className="pg-error-banner">⚠ {error}</div>}
    </div>
  );
}

function DemoApp({
  slotEls,
  slotCounts,
  state,
}: {
  slotEls: React.MutableRefObject<Record<Slot, HTMLDivElement | null>>;
  slotCounts: Record<string, number>;
  state: DemoState | null;
}) {
  const set = (slot: Slot) => (el: HTMLDivElement | null) => {
    slotEls.current[slot] = el;
  };
  return (
    <div className="demo-app">
      <div className="demo-toolbar">
        <span className="app-name">📝 Acme Docs</span>
        <div className="slot-flex">
          <div ref={set("toolbar")} data-slot="toolbar" />
          {!slotCounts.toolbar && <span className="slot-empty">toolbar</span>}
        </div>
      </div>
      <div className="demo-main">
        <div className="demo-sidebar">
          <div ref={set("sidebar")} data-slot="sidebar" />
          {!slotCounts.sidebar && <span className="slot-empty">sidebar slot</span>}
        </div>
        <div className="demo-content">
          <div className="demo-doc-title">{state?.title ?? "Untitled document"}</div>
          <div className="demo-doc-body">
            The quick brown fox jumps over the lazy dog. Plugins can extend this
            document with new UI, commands, and behaviour.
          </div>
          <div ref={set("content")} data-slot="content" />
          {!slotCounts.content && <span className="slot-empty">content slot</span>}
        </div>
      </div>
      <div className="demo-statusbar">
        <span>{state ? `${state.words} words` : "—"}</span>
        <span>·</span>
        <span>{state ? `${state.unread} unread` : ""}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <div ref={set("statusbar")} data-slot="statusbar" />
          {!slotCounts.statusbar && <span className="slot-empty">statusbar</span>}
        </div>
      </div>
    </div>
  );
}

function Console({ logs }: { logs: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);
  return (
    <div className="pg-console" ref={ref} style={{ maxHeight: "none", flex: 1 }}>
      {logs.length === 0 ? (
        <div className="pg-empty-console">No output yet. Your plugin's logs and events appear here.</div>
      ) : (
        logs.map((l, i) => (
          <div className="log-line" key={i}>
            <span className={`ll-tag ll-${l.level}`}>{l.level}</span>
            <span>{l.message}</span>
          </div>
        ))
      )}
    </div>
  );
}
