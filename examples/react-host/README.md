# Plugger · React host example

A minimal but complete example of making a React SPA extensible with Plugger.

It shows an application author's side of the story:

- **`src/host.ts`** — creates the `PluginHost` with state, an `api`, UI slots,
  and a permission policy. Exports an `AcmeContract` type for plugin authors.
- **`src/plugins.ts`** — two first-party plugins (`word-count`, `formatter`)
  written against the contract.
- **`src/App.tsx`** — wires the host into React with `PluggerProvider`,
  renders slots with `PluggerSlot`, and includes a box to load remote plugins
  by npm name, URL, or `github:owner/repo`.

## Run it

```bash
bun install
bun run --filter @plugger/example-react-host dev
```

Then try loading a remote plugin — paste a URL to any ES module that
`export default definePlugin({ ... })` and press **Load plugin**.
