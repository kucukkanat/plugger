# @plugger/core

The framework-agnostic runtime of [Plugger](../../README.md) — a browser-native
meta framework for building plugin systems for any single-page app.

```bash
npm install @plugger/core
```

## What's inside

- **`createPluginHost(options)`** — the host an application author creates.
- **`definePlugin(definition)`** — identity helper for authoring typed plugins.
- **`createStore(state)`** — a tiny reactive store.
- Source **resolver** (url / npm / github → ES module URL), lazy **loader**,
  **command** & **UI** registries, and a capability-based **permission** system.

## Host example

```ts
import { createPluginHost } from "@plugger/core";

const host = createPluginHost({
  state: { count: 0 },
  api: { increment: () => {} },
  slots: ["toolbar"],
});

await host.load("@acme/some-plugin"); // npm, URL, or github:owner/repo
```

## Plugin example

```ts
import { definePlugin } from "@plugger/core";

export default definePlugin({
  name: "my-plugin",
  permissions: ["ui:render"],
  activate(ctx) {
    ctx.ui.contribute("toolbar", {
      mount: (el) => void (el.textContent = "Hello!"),
    });
  },
});
```

See the [full documentation](../../README.md#documentation) for the complete API
and interactive playgrounds.

## License

MIT
