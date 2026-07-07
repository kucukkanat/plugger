import { useEffect, useRef } from "react";
import { configureMonaco, type monaco as Monaco } from "./monaco";

export interface EditorProps {
  value: string;
  path: string;
  language?: string;
  theme: "light" | "dark";
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onReady?: (
    editor: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco,
  ) => void;
}

/** A self-contained Monaco editor instance with the Plugger TS environment. */
export function Editor({
  value,
  path,
  language = "typescript",
  theme,
  readOnly,
  onChange,
  onReady,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const monaco = configureMonaco();
    if (!containerRef.current) return;

    const uri = monaco.Uri.parse(path);
    const existing = monaco.editor.getModel(uri);
    const model = existing ?? monaco.editor.createModel(value, language, uri);

    const editor = monaco.editor.create(containerRef.current, {
      model,
      theme: theme === "dark" ? "plugger-dark" : "plugger-light",
      automaticLayout: true,
      fontSize: 13.5,
      fontFamily:
        "'JetBrains Mono', ui-monospace, 'SF Mono', 'Fira Code', Menlo, monospace",
      fontLigatures: true,
      lineNumbers: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 14, bottom: 14 },
      renderLineHighlight: "line",
      smoothScrolling: true,
      tabSize: 2,
      readOnly,
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      overviewRulerLanes: 0,
      cursorBlinking: "smooth",
      roundedSelection: true,
    });
    editorRef.current = editor;

    const sub = editor.onDidChangeModelContent(() => onChange?.(editor.getValue()));
    onReady?.(editor, monaco);

    return () => {
      sub.dispose();
      editor.dispose();
      model.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // React to external theme changes.
  useEffect(() => {
    const monaco = configureMonaco();
    monaco.editor.setTheme(theme === "dark" ? "plugger-dark" : "plugger-light");
  }, [theme]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
