<div align="center">

# 🔌 Plugger

**A browser-native meta framework for building plugin systems for any SPA.**

Let other developers extend your web app with lazily-loaded TypeScript/JavaScript
packages — from npm, a URL, or a GitHub repo — with **no bundling and no
transpilation** in your application.

[Documentation & playgrounds](#documentation) · [Quick start](#quick-start) · [Packages](#packages) · [Examples](./examples)

</div>

---

## Why Plugger?

Plugin systems like those in VS Code or Figma are powerful but bespoke. Plugger
gives you that model as a small library you drop into your own single-page app:

- 🌐 **Browser-native.** Plugins are standard ES modules, loaded at runtime with
  the platform's own `import()`. No build step for plugins inside your app.
- 📦 **Load from anywhere.** An npm package name, a URL, or `github:owner/repo` —
  resolved through a CDN and lazy-loaded on demand.
- 🔐 **Capability security.** Plugins declare what they need (state, UI, commands,
  storage, network, specific services). You decide what's granted; everything
  else throws a `PermissionError`.
- 🧩 **Any framework.** React, Preact, Vue, Web Components, or vanilla JS. UI
  contributions speak DOM, so one plugin runs in every host.
- ⚡ **Reactive by default.** A tiny built-in store keeps the host and every
  plugin in sync with fine-grained selectors.
- 🧠 **End-to-end types.** Publish your host contract and plugin authors get full
  autocomplete and type-checking against your state and services.

## Quick start

### For application authors

```bash
npm install @plugger/core @plugger/react
```

```ts
// host.ts
import { createPluginHost } from "@plugger/core";

export const host = createPluginHost({
  state: { user: "ada", theme: "light" },
  api: { toast: (m: string) => console.log(m) },
  slots: ["toolbar", "sidebar"],
});
```

```tsx
// App.tsx
import { PluggerProvider, PluggerSlot } from "@plugger/react";
import { host } from "./host";

export function App() {
  return (
    <PluggerProvider host={host}>
      <header><PluggerSlot name="toolbar" /></header>
      <aside><PluggerSlot name="sidebar" fallback={<p>No panels yet</p>} /></aside>
    </PluggerProvider>
  );
}
```

```ts
// Load plugins from anywhere:
await host.load("@acme/word-count");                 // npm
await host.load("https://plugins.acme.com/x.mjs");   // URL
await host.load("github:acme/emoji-picker@v2");      // GitHub
```

### For plugin developers

```ts
import { definePlugin } from "@plugger/core";

export default definePlugin({
  name: "hello-world",
  version: "1.0.0",
  permissions: ["ui:render", "state:read"],
  activate(ctx) {
    ctx.ui.contribute("toolbar", {
      mount(el) {
        const btn = document.createElement("button");
        btn.textContent = `👋 Hi, ${ctx.store.getState().user}`;
        el.appendChild(btn);
        return () => btn.remove(); // auto-cleanup on deactivate
      },
    });
  },
});
```

## Packages

| Package | Description |
| --- | --- |
| [`@plugger/core`](./packages/core) | The framework-agnostic runtime: resolver, loader, store, registries, permissions, host. |
| [`@plugger/react`](./packages/react) | React `PluggerProvider`, `PluggerSlot`, and hooks. |
| [`@plugger/preact`](./packages/preact) | The same API for Preact. |
| [`@plugger/vue`](./packages/vue) | Vue 3 `providePlugger`, `PluggerSlot`, composables. |
| [`@plugger/web-components`](./packages/web-components) | A `<plugger-slot>` custom element. |
| [`@plugger/vanilla`](./packages/vanilla) | Framework-free `renderSlot` DOM engine (shared by all adapters). |

## Documentation

The docs site is a Vite app with **live Monaco TypeScript playgrounds** that
compile and run real plugins entirely in your browser.

```bash
pnpm install
pnpm docs:dev        # http://localhost:5173
```

## How it works

```
             ┌───────────────────────── your SPA ─────────────────────────┐
             │                                                             │
  source ───▶│  resolver ──▶ loader (import) ──▶ host ──▶ scoped context   │
 (url/npm/   │   classify      ES module         │         (permission-    │
   github)   │                                   │          gated)         │
             │                     store · commands · UI slots · events    │
             │                                   │                         │
             │        adapters (React/Vue/…) render slots into your UI     │
             └─────────────────────────────────────────────────────────────┘
```

1. **Resolve** a source string/object to an ES module URL.
2. **Load** it with an injectable importer (native `import()` by default).
3. **Register** it, computing the permissions it's granted.
4. **Activate** it, handing it a scoped context where every capability is
   permission-gated and every side effect is tracked for automatic cleanup.

## Development

This is a pnpm workspace.

```bash
pnpm install
pnpm build          # build all packages
pnpm test           # unit tests (Vitest)
pnpm test:e2e       # end-to-end tests (Playwright) against the docs playground
pnpm typecheck      # typecheck every package
pnpm docs:dev       # run the documentation site
```

- **145 unit tests** cover the core runtime and every adapter.
- **End-to-end tests** drive the real in-browser compile-and-run playground.

## License

[MIT](./LICENSE)
