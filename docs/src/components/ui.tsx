import { useState, type ReactNode } from "react";
import { highlight } from "./highlight";
import {
  FRAMEWORKS,
  frameworkMeta,
  useFramework,
  type Framework,
} from "../framework";

export function CodeBlock({
  children,
  lang = "ts",
  filename,
  /** Drop the built-in title bar — used when a tab strip sits above instead. */
  hideHead = false,
}: {
  children: string;
  lang?: string;
  filename?: string;
  hideHead?: boolean;
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
      {!hideHead && (
        <div className="cb-head">
          <span className="cb-dot" style={{ background: dotColor }} />
          <span>{filename ?? langLabel(lang)}</span>
        </div>
      )}
      <button className="copy-btn" onClick={copy}>
        {copied ? "Copied ✓" : "Copy"}
      </button>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </div>
  );
}

export interface CodeVariant {
  code: string;
  lang?: string;
  filename?: string;
}
export type FrameworkVariants = Partial<Record<Framework, CodeVariant>>;

/**
 * A code block that swaps its contents with the reader's chosen framework.
 * Only frameworks present in `variants` get a tab; picking one updates the
 * site-wide selection so every other block follows along.
 */
export function FrameworkCode({ variants }: { variants: FrameworkVariants }) {
  const { framework, setFramework } = useFramework();
  const available = FRAMEWORKS.filter((f) => variants[f.id]);
  if (available.length === 0) return null;
  const active = variants[framework] ? framework : available[0].id;
  const variant = variants[active]!;
  return (
    <div className="fw-code">
      <div className="fw-tabs" role="tablist" aria-label="Framework">
        {available.map((f) => (
          <button
            key={f.id}
            role="tab"
            type="button"
            aria-selected={f.id === active}
            className={f.id === active ? "active" : ""}
            onClick={() => setFramework(f.id)}
          >
            <span className="fw-dot" style={{ background: f.dot }} />
            {f.label}
          </button>
        ))}
        {variant.filename && <span className="fw-file">{variant.filename}</span>}
      </div>
      <CodeBlock lang={variant.lang} hideHead>
        {variant.code}
      </CodeBlock>
    </div>
  );
}

/** The install command for `@plugger/core` plus the active framework's adapter. */
export function FrameworkInstall() {
  const { framework } = useFramework();
  return (
    <CodeBlock lang="bash">{`npm install @plugger/core ${frameworkMeta(framework).pkg}`}</CodeBlock>
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
