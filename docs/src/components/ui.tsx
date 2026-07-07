import { useState, type ReactNode } from "react";
import { highlight } from "./highlight";

export function CodeBlock({
  children,
  lang = "ts",
  filename,
}: {
  children: string;
  lang?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);
  const code = children.replace(/\n$/, "");
  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const dotColor =
    lang === "bash" ? "#f59e0b" : lang === "html" ? "#e34c26" : "#6d5efc";
  return (
    <div className="codeblock">
      <div className="cb-head">
        <span className="cb-dot" style={{ background: dotColor }} />
        <span>{filename ?? langLabel(lang)}</span>
      </div>
      <button className="copy-btn" onClick={copy}>
        {copied ? "Copied ✓" : "Copy"}
      </button>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </div>
  );
}

function langLabel(lang: string): string {
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    bash: "shell",
    html: "html",
    json: "json",
  };
  return map[lang] ?? lang;
}

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warn" | "tip";
  title?: string;
  children: ReactNode;
}) {
  const icon = type === "warn" ? "⚠️" : type === "tip" ? "💡" : "ℹ️";
  return (
    <div className={`callout ${type}`}>
      <span className="cico">{icon}</span>
      <div>
        {title && <strong>{title}</strong>}
        <p>{children}</p>
      </div>
    </div>
  );
}

export function Card({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="cico">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function Grid({
  cols = 2,
  children,
}: {
  cols?: 2 | 3;
  children: ReactNode;
}) {
  return <div className={`grid cols-${cols}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}
