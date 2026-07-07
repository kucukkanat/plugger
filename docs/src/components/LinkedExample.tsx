import { useEffect, useMemo, useRef, useState } from "react";
import { highlight } from "./highlight";
import {
  FRAMEWORKS,
  frameworkMeta,
  useFramework,
  type Framework,
} from "../framework";
import { buildHost, type ConnectedExample } from "../examples/connected";

/**
 * Two code panes — host and plugin — that cross-highlight related symbols on
 * hover. The highlighted HTML is injected (not React children), so hover is
 * detected by event delegation on the <pre> and the active class is toggled
 * imperatively; both panes share one `hoverId`, so a symbol lit in one lights
 * its matches in the other.
 */
export function LinkedExample({ example }: { example: ConnectedExample }) {
  const { framework, setFramework } = useFramework();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const linkMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const link of example.links)
      for (const token of link.tokens) map[token] = link.id;
    return map;
  }, [example.links]);

  // Host code is generated for every framework, so all four get a tab.
  const activeFramework: Framework = framework;
  const hostCode = buildHost(example, activeFramework);
  const note = example.links.find((l) => l.id === hoverId)?.note;

  return (
    <div className="recipe">
      <div className="fw-tabs recipe-fw" role="tablist" aria-label="Framework">
        {FRAMEWORKS.map((f) => (
          <button
            key={f.id}
            role="tab"
            type="button"
            aria-selected={f.id === activeFramework}
            className={f.id === activeFramework ? "active" : ""}
            onClick={() => setFramework(f.id)}
          >
            <span className="fw-dot" style={{ background: f.dot }} />
            {f.label}
          </button>
        ))}
      </div>

      <div className="recipe-grid">
        <Pane
          label="Host"
          sub={`${frameworkMeta(activeFramework).label} app`}
          code={hostCode}
          linkMap={linkMap}
          hoverId={hoverId}
          onHover={setHoverId}
        />
        <Pane
          label="Plugin"
          sub="framework-agnostic"
          code={example.plugin}
          linkMap={linkMap}
          hoverId={hoverId}
          onHover={setHoverId}
        />
      </div>

      <div className={`recipe-note ${note ? "on" : ""}`} aria-live="polite">
        {note ?? "Hover a highlighted symbol to see how the plugin connects to the host."}
      </div>
    </div>
  );
}

function Pane({
  label,
  sub,
  code,
  linkMap,
  hoverId,
  onHover,
}: {
  label: string;
  sub: string;
  code: string;
  linkMap: Record<string, string>;
  hoverId: string | null;
  onHover: (id: string | null) => void;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const html = useMemo(() => highlight(code, "ts", linkMap), [code, linkMap]);

  // Toggle the active class on every linked node when the shared hover changes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (const node of el.querySelectorAll<HTMLElement>("[data-link]")) {
      node.classList.toggle(
        "link-active",
        hoverId !== null && node.dataset.link === hoverId,
      );
    }
  }, [hoverId, html]);

  return (
    <div className="recipe-pane">
      <div className="recipe-pane-head">
        <span className="recipe-pane-label">{label}</span>
        <span className="recipe-pane-sub">{sub}</span>
      </div>
      <pre
        ref={ref}
        onMouseOver={(e) => {
          const target = (e.target as HTMLElement).closest<HTMLElement>("[data-link]");
          onHover(target?.dataset.link ?? null);
        }}
        onMouseLeave={() => onHover(null)}
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
