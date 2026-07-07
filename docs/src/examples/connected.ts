/**
 * "Connected" examples pair a plugin with the host it runs against, so a plugin
 * developer can see exactly which host declaration each `ctx.*` call reaches.
 * The plugin source is framework-agnostic (it contributes DOM); the host's
 * slot-rendering tail adapts to the reader's chosen framework, while the parts
 * that the links point at — state, api, slots — stay identical everywhere.
 */
import type { Framework } from "../framework";
import { HELLO, WORD_COUNT, TODOS, THEME, PERMISSIONS } from "./plugins";

export interface ConnectedLink {
  id: string;
  /** Exact token text to make interactive: an identifier, or a string's inner text. */
  tokens: string[];
  /** Shown beneath the panes while the link is hovered. */
  note: string;
}

export interface ConnectedExample {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Framework-agnostic plugin module. */
  plugin: string;
  /** Host code minus the slot-rendering tail (which is framework-specific). */
  hostCore: string;
  /** The slot this recipe renders, threaded into the framework tail. */
  slot: string;
  links: ConnectedLink[];
}

/** The framework-specific way to render a slot, appended to every host pane. */
function mountSnippet(framework: Framework, slot: string): string {
  switch (framework) {
    case "react":
      return `// Render the slot in your React tree:
import { PluggerProvider, PluggerSlot } from "@plugger/react";

<PluggerProvider host={host}>
  <PluggerSlot name="${slot}" />
</PluggerProvider>`;
    case "vue":
      return `<!-- App.vue -->
<script setup lang="ts">
import { providePlugger, PluggerSlot } from "@plugger/vue";
providePlugger(host);
</script>

<template>
  <PluggerSlot name="${slot}" />
</template>`;
    case "vanilla":
      return `// Render the slot into an existing element:
import { renderSlot } from "@plugger/vanilla";

renderSlot(host, "${slot}", document.querySelector("#${slot}"));`;
    case "web-components":
      return `<!-- Register the element, then use it anywhere: -->
<script type="module">
  import { definePluggerElements, setDefaultHost } from "@plugger/web-components";
  setDefaultHost(host);
  definePluggerElements();
</script>

<plugger-slot name="${slot}"></plugger-slot>`;
  }
}

/** Assemble the full host pane for a recipe in the reader's framework. */
export function buildHost(
  example: ConnectedExample,
  framework: Framework,
): string {
  return `${example.hostCore}\n\n${mountSnippet(framework, example.slot)}`;
}

const HELLO_HOST = `import { createPluginHost } from "@plugger/core";

// Declare the UI slots your app exposes; plugins contribute into them by name.
export const host = createPluginHost({
  slots: ["toolbar"],
});

// Load the plugin — it activates against the contract above.
await host.load("@demo/hello-world");`;

const READ_HOST = `import { createPluginHost } from "@plugger/core";

// The host owns reactive state and the UI slots plugins may fill.
export const host = createPluginHost({
  state: {
    title: "My document",
    words: 128, // the plugin subscribes to this slice
  },
  slots: ["statusbar"],
});

await host.load("@demo/reading-time");`;

const TODO_HOST = `import { createPluginHost } from "@plugger/core";

export const host = createPluginHost({
  state: {
    todos: [{ id: 1, text: "Try editing the plugin", done: false }],
  },
  api: {
    // Reachable only by plugins granted the "api:addTodo" permission.
    addTodo(text) {
      const todo = { id: Date.now(), text, done: false };
      host.store.setState((s) => ({ todos: [...s.todos, todo] }));
      return todo;
    },
  },
  slots: ["sidebar"],
});

await host.load("@demo/todo-panel");`;

const THEME_HOST = `import { createPluginHost } from "@plugger/core";

export const host = createPluginHost({
  state: {
    theme: "light", // the plugin flips this and the whole app reacts
    unread: 0,
  },
  api: {
    // Called by the plugin right after it writes state.
    notify(message) {
      host.store.setState((s) => ({ unread: s.unread + 1 }));
      console.log("🔔", message);
    },
  },
  slots: ["toolbar"],
});

await host.load("@demo/theme-switch");`;

const PERMISSIONS_HOST = `import { createPluginHost } from "@plugger/core";

export const host = createPluginHost({
  state: { unread: 0 },
  api: {
    notify: (message) => console.log("🔔", message),
  },
  slots: ["toolbar"],

  // The plugin only REQUESTS permissions — this policy decides what it gets.
  permissions: {
    // 1. Baseline: granted to every plugin, no prompt.
    default: ["ui:render"],

    // 2. Extra capabilities you trust THIS plugin (by name) to have.
    grants: {
      "note-taker": ["state:write", "api:notify"],
    },

    // 3. Anything a plugin requests beyond the above is asked for here.
    //    Return true to grant — wire this to a real consent dialog.
    async onRequest(permission, plugin) {
      return confirm(\`Allow "\${plugin}" to use \${permission}?\`);
    },
  },
});

await host.load("@demo/note-taker");`;

export const CONNECTED: ConnectedExample[] = [
  {
    id: "hello",
    emoji: "👋",
    title: "Hello World",
    description:
      "The smallest possible plugin: contribute one button into a host slot.",
    plugin: HELLO,
    hostCore: HELLO_HOST,
    slot: "toolbar",
    links: [
      {
        id: "toolbar",
        tokens: ["toolbar"],
        note: 'The plugin contributes into the "toolbar" slot — the host must declare it in `slots` (and render it) for the UI to appear.',
      },
    ],
  },
  {
    id: "reading-time",
    emoji: "⏱",
    title: "Read State",
    description:
      "Subscribe to a slice of host state and keep a widget in sync with it.",
    plugin: WORD_COUNT,
    hostCore: READ_HOST,
    slot: "statusbar",
    links: [
      {
        id: "words",
        tokens: ["words"],
        note: "`ctx.store.select((s) => s.words, …)` reads the `words` slice the host seeded in its initial state; the callback re-runs whenever it changes.",
      },
      {
        id: "statusbar",
        tokens: ["statusbar"],
        note: 'This widget lands in the "statusbar" slot declared on the host.',
      },
    ],
  },
  {
    id: "todos",
    emoji: "✅",
    title: "State + API",
    description:
      "Read a state slice and call a host service the host chose to expose.",
    plugin: TODOS,
    hostCore: TODO_HOST,
    slot: "sidebar",
    links: [
      {
        id: "todos",
        tokens: ["todos"],
        note: "The plugin reads and renders `state.todos`; the host owns the array and mutates it inside `addTodo`.",
      },
      {
        id: "addTodo",
        tokens: ["addTodo"],
        note: "`ctx.api.addTodo(…)` invokes this host service — which requires the plugin's `api:addTodo` permission.",
      },
      {
        id: "sidebar",
        tokens: ["sidebar"],
        note: 'The list is contributed into the host\'s "sidebar" slot.',
      },
    ],
  },
  {
    id: "theme",
    emoji: "🎨",
    title: "Write State",
    description:
      "Mutate shared state and notify the host; the whole app reacts.",
    plugin: THEME,
    hostCore: THEME_HOST,
    slot: "toolbar",
    links: [
      {
        id: "theme",
        tokens: ["theme"],
        note: "The plugin reads and writes the `theme` slice with `state:write`; every subscriber (host and other plugins) re-renders.",
      },
      {
        id: "notify",
        tokens: ["notify"],
        note: "`ctx.api.notify(…)` reaches this host service, which bumps `unread` and logs — a side effect the host controls.",
      },
      {
        id: "toolbar",
        tokens: ["toolbar"],
        note: 'The toggle button is contributed into the host\'s "toolbar" slot.',
      },
    ],
  },
  {
    id: "permissions",
    emoji: "🔐",
    title: "Permissions",
    description:
      "A plugin only requests capabilities; the host's policy is the authority on what it actually gets.",
    plugin: PERMISSIONS,
    hostCore: PERMISSIONS_HOST,
    slot: "toolbar",
    links: [
      {
        id: "note-taker",
        tokens: ["note-taker"],
        note: "The policy's `grants` map is keyed by plugin name, so these extra capabilities apply to exactly this plugin once it loads.",
      },
      {
        id: "ui:render",
        tokens: ["ui:render"],
        note: "Pre-approved for everyone via the policy's `default`. It gates the managed `ctx.ui.contribute(...)` path — not raw DOM, which any in-realm script already has. See the Permissions guide on mediated vs ambient authority.",
      },
      {
        id: "state:write",
        tokens: ["state:write"],
        note: "Granted only to `note-taker` via `grants`. Without it, `ctx.store.setState(...)` throws a PermissionError instead of mutating state.",
      },
      {
        id: "api:notify",
        tokens: ["api:notify"],
        note: "Also granted via `grants`, unlocking the host's `notify` service through `ctx.api.notify(...)`. Anything the plugin requests beyond default + grants falls through to `onRequest`.",
      },
    ],
  },
];
