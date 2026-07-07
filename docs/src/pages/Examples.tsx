import { Callout, Eyebrow } from "../components/ui";
import { EXAMPLES } from "../examples/plugins";
import { highlight } from "../components/highlight";
import { navigate, Link } from "../router";
import { frameworkMeta, useFramework } from "../framework";

export function Examples() {
  const label = frameworkMeta(useFramework().framework).label;
  return (
    <article className="prose">
      <Eyebrow>Examples</Eyebrow>
      <h1>Example gallery</h1>
      <p className="lead">
        Real, runnable plugins covering every part of the API. Click any card to
        open it in the playground.
      </p>

      <Callout type="info" title={`Drop-in for your ${label} app`}>
        Every plugin here is a plain ES module that contributes DOM — so the
        same file runs unchanged in {label}. Wire it up with the{" "}
        <Link to="/docs/frameworks">{label} adapter</Link>, then{" "}
        <code>host.load()</code> any of these.
      </Callout>

      <div className="grid cols-2" style={{ marginTop: 30 }}>
        {EXAMPLES.map((e) => (
          <button
            key={e.id}
            className="card example-card"
            onClick={() => navigate(`/playground/${e.id}`)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
            }}
          >
            <div className="cico">{e.emoji}</div>
            <h3>{e.label}</h3>
            <p>{e.description}</p>
            <pre
              className="example-peek"
              dangerouslySetInnerHTML={{
                __html: highlight(previewOf(e.code)),
              }}
            />
            <span className="example-open">Open in playground →</span>
          </button>
        ))}
      </div>
    </article>
  );
}

function previewOf(code: string): string {
  return code
    .split("\n")
    .filter((l) => !l.startsWith("import"))
    .join("\n")
    .trim()
    .split("\n")
    .slice(0, 7)
    .join("\n");
}
