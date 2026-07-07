import { useState } from "react";
import { Eyebrow } from "../components/ui";
import { LinkedExample } from "../components/LinkedExample";
import { CONNECTED } from "../examples/connected";

export function Recipes() {
  const [activeId, setActiveId] = useState(CONNECTED[0].id);
  const example = CONNECTED.find((e) => e.id === activeId) ?? CONNECTED[0];

  return (
    <div className="recipes-page">
      <div className="recipes-inner">
        <Eyebrow>Recipes</Eyebrow>
        <h1>Host &amp; plugin, side by side</h1>
        <p className="lead">
          Each recipe shows a plugin next to the host it runs against. Hover any{" "}
          <span className="recipe-hint">highlighted symbol</span> and its
          counterpart lights up in the other pane — so you can see exactly which
          host declaration every <code>ctx.*</code> call reaches. Switch
          frameworks from the top nav and the host adapts.
        </p>

        <div className="recipe-picker" role="tablist" aria-label="Recipe">
          {CONNECTED.map((e) => (
            <button
              key={e.id}
              role="tab"
              type="button"
              aria-selected={e.id === activeId}
              className={`recipe-pill ${e.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(e.id)}
            >
              <span className="recipe-pill-emoji">{e.emoji}</span>
              {e.title}
            </button>
          ))}
        </div>

        <p className="recipe-desc">{example.description}</p>
        <LinkedExample key={example.id} example={example} />
      </div>
    </div>
  );
}
