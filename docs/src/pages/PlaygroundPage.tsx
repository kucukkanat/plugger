import { useMemo } from "react";
import { Playground } from "../playground/Playground";
import { EXAMPLES } from "../examples/plugins";
import { navigate, useRoute } from "../router";

export function PlaygroundPage() {
  const route = useRoute();
  const currentId = useMemo(() => {
    const m = route.match(/^\/playground\/(.+)$/);
    return m?.[1] ?? EXAMPLES[0].id;
  }, [route]);
  const example = EXAMPLES.find((e) => e.id === currentId) ?? EXAMPLES[0];

  return (
    <div className="playground-page">
      <div className="pp-head">
        <h1>Playground</h1>
        <p>
          A full TypeScript environment running entirely in your browser. Pick an
          example, edit the code, and press Run (or ⌘/Ctrl + Enter).
        </p>
      </div>

      <div className="example-picker">
        {EXAMPLES.map((e) => (
          <button
            key={e.id}
            className={`example-chip ${e.id === example.id ? "active" : ""}`}
            onClick={() => navigate(`/playground/${e.id}`)}
          >
            {e.emoji} {e.label}
          </button>
        ))}
      </div>

      <Playground
        key={example.id}
        code={example.code}
        title={`${example.id}.ts`}
        variant="full"
      />
    </div>
  );
}
