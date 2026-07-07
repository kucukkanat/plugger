/**
 * Example plugin sources used across the docs playgrounds. Each is authored in
 * TypeScript against `@plugger/core` and the demo host's `@demo/host` contract,
 * and runs unmodified in the browser.
 */
export interface Example {
  id: string;
  label: string;
  emoji: string;
  description: string;
  code: string;
}

export const HELLO = `import { definePlugin } from "@plugger/core";
import type { DemoApi, DemoState } from "@demo/host";

// A plugin is just an ES module whose default export is a plugin definition.
export default definePlugin<DemoApi, DemoState>({
  name: "hello-world",
  version: "1.0.0",
  // Declare only the capabilities you need — the host grants them.
  permissions: ["ui:render"],
  activate(ctx) {
    // Contribute a button into the host's "toolbar" slot.
    ctx.ui.contribute("toolbar", {
      mount(el) {
        const btn = document.createElement("button");
        btn.textContent = "👋 Say hi";
        btn.className = "chip";
        btn.onclick = () => alert("Hello from a plugin!");
        el.appendChild(btn);
        // Return a cleanup — called automatically on deactivate.
        return () => btn.remove();
      },
    });
    ctx.logger.info("hello-world activated");
  },
});
`;

export const WORD_COUNT = `import { definePlugin } from "@plugger/core";
import type { DemoApi, DemoState } from "@demo/host";

// Read reactive application state and keep a widget in sync.
export default definePlugin<DemoApi, DemoState>({
  name: "reading-time",
  permissions: ["ui:render", "state:read"],
  activate(ctx) {
    ctx.ui.contribute("statusbar", {
      mount(el) {
        const span = document.createElement("span");
        span.className = "chip";
        const render = (words: number) => {
          const mins = Math.max(1, Math.round(words / 200));
          span.textContent = \`⏱ \${mins} min read\`;
        };
        render(ctx.store.getState().words);
        // select() fires only when the "words" slice changes.
        ctx.store.select((s) => s.words, render);
        el.appendChild(span);
      },
    });
  },
});
`;

export const TODOS = `import { definePlugin } from "@plugger/core";
import type { DemoApi, DemoState } from "@demo/host";

// Combine state (read) with a host API service (addTodo).
export default definePlugin<DemoApi, DemoState>({
  name: "todo-panel",
  permissions: ["ui:render", "state:read", "api:addTodo"],
  activate(ctx) {
    ctx.ui.contribute("sidebar", {
      mount(el) {
        const wrap = document.createElement("div");
        const list = document.createElement("ul");
        list.className = "plug-list";

        const draw = (todos: DemoState["todos"]) => {
          list.innerHTML = "";
          for (const t of todos) {
            const li = document.createElement("li");
            li.textContent = (t.done ? "✅ " : "⬜ ") + t.text;
            list.appendChild(li);
          }
        };
        draw(ctx.store.getState().todos);
        ctx.store.select((s) => s.todos, draw);

        const add = document.createElement("button");
        add.className = "chip";
        add.textContent = "+ Add task";
        add.onclick = () => ctx.api.addTodo("Task #" + Date.now() % 100);

        wrap.append(list, add);
        el.appendChild(wrap);
      },
    });
  },
});
`;

export const COMMANDS = `import { definePlugin } from "@plugger/core";
import type { DemoApi, DemoState } from "@demo/host";

// Register commands, then surface them however you like.
export default definePlugin<DemoApi, DemoState>({
  name: "shout-command",
  permissions: ["ui:render", "commands:register", "commands:execute", "api:shout"],
  activate(ctx) {
    ctx.commands.register({
      id: "demo.shout",
      title: "Shout the title",
      run: () => ctx.api.shout("plugins are awesome"),
    });

    ctx.ui.contribute("toolbar", {
      mount(el) {
        const btn = document.createElement("button");
        btn.className = "chip";
        btn.textContent = "📣 Run command";
        btn.onclick = () => {
          const result = ctx.commands.execute<string>("demo.shout");
          ctx.logger.info("command returned:", result);
        };
        el.appendChild(btn);
      },
    });
  },
});
`;

export const THEME = `import { definePlugin } from "@plugger/core";
import type { DemoApi, DemoState } from "@demo/host";

// Write to shared state — the whole app (and other plugins) react.
export default definePlugin<DemoApi, DemoState>({
  name: "theme-switch",
  permissions: ["ui:render", "state:read", "state:write", "api:notify"],
  activate(ctx) {
    ctx.ui.contribute("toolbar", {
      mount(el) {
        const btn = document.createElement("button");
        btn.className = "chip";
        const sync = (theme: string) => (btn.textContent = theme === "dark" ? "🌙 Dark" : "☀️ Light");
        sync(ctx.store.getState().theme);
        ctx.store.select((s) => s.theme, sync);
        btn.onclick = () => {
          const next = ctx.store.getState().theme === "dark" ? "light" : "dark";
          ctx.store.setState({ theme: next });
          ctx.api.notify("Theme set to " + next);
        };
        el.appendChild(btn);
      },
    });
  },
});
`;

export const EVENTS = `import { definePlugin } from "@plugger/core";
import type { DemoApi, DemoState } from "@demo/host";

// Plugins can talk to each other (and the host) over a namespaced event bus.
export default definePlugin<DemoApi, DemoState>({
  name: "event-emitter",
  permissions: ["ui:render", "events:emit", "events:listen"],
  activate(ctx) {
    let count = 0;
    ctx.events.on<number>("ping", (n) => ctx.logger.info("received ping #" + n));

    ctx.ui.contribute("content", {
      mount(el) {
        const btn = document.createElement("button");
        btn.className = "chip";
        btn.textContent = "🛰 Emit event";
        btn.onclick = () => ctx.events.emit("ping", ++count);
        el.appendChild(btn);
      },
    });
  },
});
`;

export const EXAMPLES: Example[] = [
  { id: "hello", label: "Hello World", emoji: "👋", description: "A toolbar button — the smallest possible plugin.", code: HELLO },
  { id: "reading-time", label: "Read State", emoji: "⏱", description: "Reactively read application state.", code: WORD_COUNT },
  { id: "todos", label: "State + API", emoji: "✅", description: "Render a list and call a host service.", code: TODOS },
  { id: "commands", label: "Commands", emoji: "📣", description: "Register and execute commands.", code: COMMANDS },
  { id: "theme", label: "Write State", emoji: "🎨", description: "Mutate shared state; the app reacts.", code: THEME },
  { id: "events", label: "Events", emoji: "🛰", description: "Publish/subscribe across plugins.", code: EVENTS },
];
