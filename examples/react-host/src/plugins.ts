import { definePlugin } from "@plugger/core";
import type { AppApi, AppState } from "./host";

/** A local, first-party plugin: a word-count badge in the status bar. */
export const wordCountPlugin = definePlugin<AppApi, AppState>({
  name: "word-count",
  version: "1.0.0",
  permissions: ["ui:render", "state:read"],
  activate(ctx) {
    ctx.ui.contribute("statusbar", {
      mount(el) {
        const span = document.createElement("span");
        const render = (n: number) => (span.textContent = `${n} words`);
        render(ctx.store.getState().wordCount);
        ctx.store.select((s) => s.wordCount, render);
        el.appendChild(span);
      },
    });
  },
});

/** A local plugin that adds a toolbar action calling a host service. */
export const formatPlugin = definePlugin<AppApi, AppState>({
  name: "formatter",
  version: "1.0.0",
  permissions: ["ui:render", "api:formatDocument", "api:notify"],
  activate(ctx) {
    ctx.ui.contribute("toolbar", {
      mount(el) {
        const btn = document.createElement("button");
        btn.textContent = "✨ Format";
        btn.onclick = () => {
          ctx.api.formatDocument();
          ctx.api.notify("Document formatted");
        };
        el.appendChild(btn);
      },
    });
  },
});
