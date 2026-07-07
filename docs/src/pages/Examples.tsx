import { Eyebrow } from "../components/ui";
import { EXAMPLES } from "../examples/plugins";
import { highlight } from "../components/highlight";
import { navigate } from "../router";

export function Examples() {
  return (
    <article className="prose">
      <Eyebrow>Examples</Eyebrow>
      <h1>Example gallery</h1>
      <p className="lead">
        Real, runnable plugins covering every part of the API. Click any card to
        open it in the playground.
      </p>

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
