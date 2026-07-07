import { Callout, CodeBlock, Eyebrow, Grid, Card } from "../components/ui";
import { Playground } from "../playground/Playground";
import { Link } from "../router";
import { HELLO, WORD_COUNT, THEME, COMMANDS } from "../examples/plugins";

/* --------------------------------------------------------------------- */
/* Introduction                                                          */
/* --------------------------------------------------------------------- */
export function Introduction() {
  return (
    <article className="prose">
      <Eyebrow>Introduction</Eyebrow>
      <h1>What is Plugger?</h1>
      <p className="lead">
        Plugger is a browser-native meta framework for building plugin systems.
        It lets the owner of a single-page app open it up so that other
        engineers can extend it with lazily-loaded packages — safely, and
        without any build step in the host application.
      </p>

      <p>
        Think of the extension model in VS Code or Figma, but as a small library
        you drop into <em>your</em> app. You declare what parts of your app are
        extensible — state, services, UI slots, commands — and Plugger handles
        loading untrusted code, scoping what it can do, and cleaning up after it.
      </p>

      <h2>The two audiences</h2>
      <Grid cols={2}>
        <Card icon="🏗️" title="Application authors">
          You own the SPA. You create a host, expose a contract, and render
          slots. See the{" "}
          <Link to="/docs/app-authors">app author guide</Link>.
        </Card>
        <Card icon="🧩" title="Plugin developers">
          You extend someone's app. You write an ES module against their
          contract. See the{" "}
          <Link to="/docs/plugin-authors">plugin developer guide</Link>.
        </Card>
      </Grid>

      <h2>Why browser-native matters</h2>
      <p>
        Traditional plugin systems require the host to re-bundle when a plugin
        changes, or ship a heavyweight sandbox. Plugger takes a different route:
        plugins are just <strong>ES modules</strong>, loaded at runtime with the
        platform's own <code>import()</code>. That means:
      </p>
      <ul>
        <li>No bundling or transpilation of plugins inside your app.</li>
        <li>Plugins can be published to npm, a CDN, or a GitHub repo.</li>
        <li>They load lazily, only when the user needs them.</li>
        <li>Your app stays a static site — deploy it anywhere.</li>
      </ul>

      <Callout type="info" title="Everything here runs in your browser">
        Every editor on this site is a real TypeScript environment, and every
        “Run” button compiles and executes an actual plugin against a live demo
        host — no server involved.
      </Callout>

      <h2>A 60-second taste</h2>
      <p>Here is a complete, working plugin. Edit it and press Run.</p>
      <Playground code={HELLO} title="hello-world.ts" />

      <Pager
        next={{ to: "/docs/app-authors", title: "For App Authors" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* App authors                                                           */
/* --------------------------------------------------------------------- */
export function AppAuthors() {
  return (
    <article className="prose">
      <Eyebrow>Guide</Eyebrow>
      <h1>For application authors</h1>
      <p className="lead">
        Make your SPA extensible in four steps: install, create a host, render
        slots, and load plugins.
      </p>

      <h2>1. Install</h2>
      <CodeBlock lang="bash">{`npm install @plugger/core
# plus the adapter for your framework:
npm install @plugger/react   # or @plugger/vue, @plugger/preact, @plugger/web-components`}</CodeBlock>

      <h2>2. Create a host</h2>
      <p>
        The host owns everything plugins can reach: reactive{" "}
        <strong>state</strong>, a set of <strong>services</strong> (your{" "}
        <code>api</code>), and the named <strong>UI slots</strong> plugins may
        contribute to.
      </p>
      <CodeBlock lang="ts" filename="host.ts">{`import { createPluginHost } from "@plugger/core";

export interface AppState {
  user: string;
  theme: "light" | "dark";
}

export interface AppApi {
  saveDocument(): Promise<void>;
  toast(message: string): void;
}

export const host = createPluginHost<AppApi, AppState>({
  state: { user: "ada", theme: "light" },
  api: {
    async saveDocument() { /* … */ },
    toast: (m) => console.log("toast:", m),
  },
  slots: ["toolbar", "sidebar", "statusbar"],
});`}</CodeBlock>

      <h2>3. Render the slots</h2>
      <p>
        Wrap your app in a provider and drop a <code>&lt;PluggerSlot&gt;</code>{" "}
        wherever plugin UI should appear. Contributions render in order and
        update live as plugins come and go.
      </p>
      <CodeBlock lang="tsx" filename="App.tsx">{`import { PluggerProvider, PluggerSlot } from "@plugger/react";
import { host } from "./host";

export function App() {
  return (
    <PluggerProvider host={host}>
      <header className="toolbar">
        <h1>My App</h1>
        <PluggerSlot name="toolbar" />
      </header>
      <aside>
        <PluggerSlot name="sidebar" fallback={<p>No panels yet</p>} />
      </aside>
    </PluggerProvider>
  );
}`}</CodeBlock>

      <Callout type="tip" title="Not using React?">
        The same host works with{" "}
        <Link to="/docs/frameworks">Vue, Preact, Web Components, and vanilla JS</Link>.
        UI contributions are plain DOM, so a plugin runs in any of them.
      </Callout>

      <h2>4. Load plugins</h2>
      <p>
        Load from an npm package name, a URL, or a GitHub repo. Plugger resolves
        the source, imports it lazily, and activates it.
      </p>
      <CodeBlock lang="ts">{`// From npm (resolved through a CDN — no install needed)
await host.load("@acme/word-count-plugin");

// From a URL
await host.load("https://plugins.acme.com/spellcheck.mjs");

// From GitHub
await host.load("github:acme/emoji-picker@v2");

// A first-party plugin you bundle yourself
import mine from "./plugins/my-plugin";
await host.use(mine);`}</CodeBlock>

      <h2>5. Publish your contract (optional, recommended)</h2>
      <p>
        Export your <code>AppApi</code> and <code>AppState</code> types in a
        small package. Plugin developers import them and get full type-checking
        against your app.
      </p>
      <CodeBlock lang="ts" filename="@myapp/plugin-sdk">{`import type { HostContract } from "@plugger/core";
export type MyAppContract = HostContract<AppApi, AppState>;`}</CodeBlock>

      <Pager
        prev={{ to: "/docs/introduction", title: "Introduction" }}
        next={{ to: "/docs/plugin-authors", title: "For Plugin Developers" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* Plugin authors                                                        */
/* --------------------------------------------------------------------- */
export function PluginAuthors() {
  return (
    <article className="prose">
      <Eyebrow>Guide</Eyebrow>
      <h1>For plugin developers</h1>
      <p className="lead">
        A plugin is an ES module whose default export is a plugin definition.
        Everything you can do to the host flows through the{" "}
        <code>context</code> passed to <code>activate</code>.
      </p>

      <h2>The shape of a plugin</h2>
      <CodeBlock lang="ts">{`import { definePlugin } from "@plugger/core";

export default definePlugin({
  name: "my-plugin",          // unique + stable
  version: "1.0.0",
  permissions: ["ui:render"], // request only what you use
  activate(ctx) {
    // extend the host here
  },
  deactivate(ctx) {
    // optional — most cleanup is automatic
  },
});`}</CodeBlock>

      <Callout type="info" title="Cleanup is automatic">
        Anything you register through <code>ctx</code> — UI, commands, event
        listeners, store subscriptions — is torn down for you when the plugin
        deactivates. You rarely need <code>deactivate</code> at all.
      </Callout>

      <h2>The context API</h2>
      <table>
        <thead>
          <tr><th>Member</th><th>What it does</th><th>Permission</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ctx.store</code></td><td>Read/write reactive app state</td><td><code>state:read</code>, <code>state:write</code></td></tr>
          <tr><td><code>ctx.ui</code></td><td>Contribute UI into slots</td><td><code>ui:render</code></td></tr>
          <tr><td><code>ctx.commands</code></td><td>Register/execute commands</td><td><code>commands:register</code>, <code>commands:execute</code></td></tr>
          <tr><td><code>ctx.api</code></td><td>Call host services</td><td><code>api:&lt;name&gt;</code></td></tr>
          <tr><td><code>ctx.events</code></td><td>Namespaced pub/sub</td><td><code>events:emit</code>, <code>events:listen</code></td></tr>
          <tr><td><code>ctx.storage</code></td><td>Persistent key/value store</td><td><code>storage</code></td></tr>
          <tr><td><code>ctx.logger</code></td><td>Namespaced console</td><td>—</td></tr>
        </tbody>
      </table>

      <h2>Reading state reactively</h2>
      <p>
        Use <code>ctx.store.select</code> to subscribe to just the slice you
        care about — it only fires when that slice changes.
      </p>
      <Playground code={WORD_COUNT} title="reading-time.ts" />

      <h2>Writing state</h2>
      <p>
        With <code>state:write</code>, a plugin can update shared state and the
        whole app reacts. Try toggling the theme:
      </p>
      <Playground code={THEME} title="theme-switch.ts" />

      <Pager
        prev={{ to: "/docs/app-authors", title: "For App Authors" }}
        next={{ to: "/docs/concepts", title: "Architecture" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* Concepts / architecture                                               */
/* --------------------------------------------------------------------- */
export function Concepts() {
  return (
    <article className="prose">
      <Eyebrow>Core concepts</Eyebrow>
      <h1>Architecture</h1>
      <p className="lead">
        Plugger has a small, framework-agnostic core surrounded by thin adapters.
        Understanding the pieces makes the rest of the docs click.
      </p>

      <h2>The host</h2>
      <p>
        The <strong>host</strong> is the object an app author creates. It owns
        the store, the exposed API, the command &amp; UI registries, and the
        plugin lifecycle. Plugins never touch these directly — they receive a{" "}
        <strong>scoped context</strong> that gates every capability behind a
        permission.
      </p>

      <h2>DOM as the lingua franca</h2>
      <p>
        A UI contribution is a <code>mount(element)</code> function. The host
        hands the plugin a DOM element; the plugin fills it however it likes
        (including with its own React/Vue instance from a CDN). Because the unit
        of UI is a DOM node, the same plugin renders inside a React host, a Vue
        host, or a plain-HTML host without modification.
      </p>
      <CodeBlock lang="ts">{`ctx.ui.contribute("toolbar", {
  mount(el, { props, document }) {
    const btn = document.createElement("button");
    btn.textContent = "Click me";
    el.appendChild(btn);
    return () => btn.remove(); // cleanup
  },
});`}</CodeBlock>

      <h2>Lifecycle</h2>
      <ol>
        <li><strong>loaded</strong> — the module was imported and validated.</li>
        <li><strong>active</strong> — <code>activate()</code> ran successfully; dependencies are activated first.</li>
        <li><strong>inactive</strong> — deactivated; all its contributions were removed.</li>
        <li><strong>error</strong> — activation threw; the host rolled back its partial registrations.</li>
      </ol>

      <Callout type="tip" title="Failure is contained">
        If a plugin throws during activation, Plugger disposes anything it had
        already registered and marks it <code>error</code> — the host and other
        plugins keep running.
      </Callout>

      <Pager
        prev={{ to: "/docs/plugin-authors", title: "For Plugin Developers" }}
        next={{ to: "/docs/sources", title: "Loading & Sources" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* Sources                                                               */
/* --------------------------------------------------------------------- */
export function Sources() {
  return (
    <article className="prose">
      <Eyebrow>Core concepts</Eyebrow>
      <h1>Loading &amp; sources</h1>
      <p className="lead">
        <code>host.load()</code> accepts a shorthand string or a structured
        source. Plugger classifies it and resolves it to an ES module URL.
      </p>

      <h2>Shorthand strings</h2>
      <table>
        <thead><tr><th>You write</th><th>Interpreted as</th><th>Resolves to (esm.sh)</th></tr></thead>
        <tbody>
          <tr><td><code>"lodash-es"</code></td><td>npm package</td><td><code>esm.sh/lodash-es</code></td></tr>
          <tr><td><code>"@acme/plugin@2.1.0"</code></td><td>npm + version</td><td><code>esm.sh/@acme/plugin@2.1.0</code></td></tr>
          <tr><td><code>"github:acme/widgets@v2"</code></td><td>GitHub repo</td><td><code>esm.sh/gh/acme/widgets@v2</code></td></tr>
          <tr><td><code>"https://cdn.x/p.mjs"</code></td><td>direct URL</td><td>itself</td></tr>
        </tbody>
      </table>

      <h2>Structured sources</h2>
      <CodeBlock lang="ts">{`await host.load({ type: "npm", name: "@acme/plugin", version: "2.1.0", cdn: "jsdelivr" });
await host.load({ type: "git", repo: "acme/widgets", ref: "main", path: "dist/index.mjs" });
await host.load({ type: "url", url: "/plugins/local.mjs" });`}</CodeBlock>

      <h2>Choosing a CDN</h2>
      <p>
        npm and git sources are resolved through a CDN that serves ES modules.
        The default is <code>esm.sh</code>; you can switch globally or per-load
        to <code>jsdelivr</code>, <code>skypack</code>, or <code>unpkg</code>.
      </p>
      <CodeBlock lang="ts">{`const host = createPluginHost({ cdn: "jsdelivr" });`}</CodeBlock>

      <h2>Custom importers &amp; offline hosts</h2>
      <p>
        Everything routes through one injectable function, so you can proxy,
        cache, allow-list, or fully sandbox how modules are fetched — and tests
        can supply a fake importer with no network at all.
      </p>
      <CodeBlock lang="ts">{`const host = createPluginHost({
  importer: async (url) => {
    if (!url.startsWith("https://plugins.myco.com/")) {
      throw new Error("Blocked: untrusted plugin origin");
    }
    return import(/* @vite-ignore */ url);
  },
});`}</CodeBlock>

      <Callout type="warn" title="Plugins are code">
        Loading a plugin runs its code with whatever permissions you grant.
        Prefer sources you trust, pin versions, and keep permission grants tight.
      </Callout>

      <Pager
        prev={{ to: "/docs/concepts", title: "Architecture" }}
        next={{ to: "/docs/permissions", title: "Permissions" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* Permissions                                                           */
/* --------------------------------------------------------------------- */
export function Permissions() {
  return (
    <article className="prose">
      <Eyebrow>Core concepts</Eyebrow>
      <h1>Permissions</h1>
      <p className="lead">
        Plugins declare the capabilities they need. The host decides what's
        granted. Any ungranted use throws a <code>PermissionError</code> — so a
        plugin can never quietly reach past what you allowed.
      </p>

      <h2>The capabilities</h2>
      <table>
        <thead><tr><th>Permission</th><th>Unlocks</th></tr></thead>
        <tbody>
          <tr><td><code>state:read</code></td><td><code>store.getState/subscribe/select</code></td></tr>
          <tr><td><code>state:write</code></td><td><code>store.setState</code></td></tr>
          <tr><td><code>ui:render</code></td><td><code>ui.contribute</code></td></tr>
          <tr><td><code>commands:register</code> / <code>commands:execute</code></td><td>the command bus</td></tr>
          <tr><td><code>events:emit</code> / <code>events:listen</code></td><td>the event bus</td></tr>
          <tr><td><code>storage</code></td><td>persistent key/value storage</td></tr>
          <tr><td><code>api:&lt;name&gt;</code></td><td>one host service; <code>api:*</code> grants all</td></tr>
        </tbody>
      </table>

      <h2>Default policy</h2>
      <p>
        With no policy configured, the host trusts each plugin's declared
        <code> permissions</code>. That's convenient for first-party plugins.
      </p>

      <h2>Locking it down</h2>
      <p>
        Provide a <code>permissions</code> policy to override that. You can set
        defaults, per-plugin grants, or an interactive consent callback.
      </p>
      <CodeBlock lang="ts">{`const host = createPluginHost({
  permissions: {
    default: ["state:read"],            // everyone may read state
    grants: {
      "trusted-plugin": ["state:write", "api:*"],
    },
    // Prompt the user for anything not already granted:
    async onRequest(permission, pluginName) {
      return confirm(\`Allow \${pluginName} to use \${permission}?\`);
    },
  },
});

// Or grant per-load:
await host.load("@acme/plugin", { permissions: ["ui:render"] });`}</CodeBlock>

      <Callout type="tip" title="Least privilege by construction">
        Because context methods assert permissions at call time, the safest
        posture is simply to grant less. The plugin degrades loudly, not
        silently.
      </Callout>

      <Pager
        prev={{ to: "/docs/sources", title: "Loading & Sources" }}
        next={{ to: "/docs/state", title: "State & Store" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* State                                                                 */
/* --------------------------------------------------------------------- */
export function StateAndStore() {
  return (
    <article className="prose">
      <Eyebrow>Core concepts</Eyebrow>
      <h1>State &amp; store</h1>
      <p className="lead">
        Plugger ships a tiny reactive store shared by the host and every plugin.
        It's dependency-free and works with your existing state too.
      </p>

      <h2>The store API</h2>
      <CodeBlock lang="ts">{`import { createStore } from "@plugger/core";

const store = createStore({ count: 0, user: "ada" });

store.getState();                       // { count: 0, user: "ada" }
store.setState({ count: 1 });           // shallow-merge
store.setState((s) => ({ count: s.count + 1 }));

const off = store.subscribe((next, prev) => { /* … */ });

// Fine-grained: only fires when the slice changes.
store.select((s) => s.count, (count) => render(count));`}</CodeBlock>

      <h2>Bring your own state</h2>
      <p>
        Pass any object as <code>state</code> and Plugger wraps it in a store —
        or pass an existing store you built with <code>createStore</code> to
        share it with the rest of your app.
      </p>

      <h2>Inside a plugin</h2>
      <p>
        Plugins get a permission-scoped view. Reads need <code>state:read</code>;
        writes need <code>state:write</code>. Subscriptions are cleaned up
        automatically on deactivate.
      </p>
      <Playground code={THEME} title="state-write.ts" />

      <Pager
        prev={{ to: "/docs/permissions", title: "Permissions" }}
        next={{ to: "/docs/commands", title: "Commands & Events" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* Commands & events                                                     */
/* --------------------------------------------------------------------- */
export function CommandsAndEvents() {
  return (
    <article className="prose">
      <Eyebrow>Core concepts</Eyebrow>
      <h1>Commands &amp; events</h1>
      <p className="lead">
        Two complementary ways for plugins to add behaviour: named commands
        (request/response) and an event bus (fire-and-forget pub/sub).
      </p>

      <h2>Commands</h2>
      <p>
        A command is a named function with optional metadata. The host can
        surface all commands in a palette; plugins can call each other's
        commands. Registration is scoped and auto-removed on deactivate.
      </p>
      <Playground code={COMMANDS} title="commands.ts" />

      <h2>Events</h2>
      <p>
        Each plugin gets a namespaced view of a shared bus. Emit within your
        namespace, or prefix an event with <code>@</code> to reach the global
        channel that the host and other plugins can hear.
      </p>
      <CodeBlock lang="ts">{`// Inside plugin "chat":
ctx.events.emit("message", { text: "hi" });   // -> "plugin:chat:message"
ctx.events.on("message", handle);             // hears its own namespace

ctx.events.emit("@app:refresh");              // global channel
`}</CodeBlock>

      <Pager
        prev={{ to: "/docs/state", title: "State & Store" }}
        next={{ to: "/docs/frameworks", title: "Framework Adapters" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* Frameworks                                                            */
/* --------------------------------------------------------------------- */
export function Frameworks() {
  return (
    <article className="prose">
      <Eyebrow>Adapters</Eyebrow>
      <h1>Framework adapters</h1>
      <p className="lead">
        The core is framework-agnostic. Each adapter is a thin binding that
        renders slots and exposes idiomatic hooks/composables. One plugin works
        across all of them.
      </p>

      <h2>React &amp; Preact</h2>
      <CodeBlock lang="tsx">{`import { PluggerProvider, PluggerSlot, usePluginStore, useCommands } from "@plugger/react";

function Toolbar() {
  const unread = usePluginStore((s) => s.unread);
  return <PluggerSlot name="toolbar" fallback={<span>{unread} unread</span>} />;
}

<PluggerProvider host={host}><Toolbar /></PluggerProvider>`}</CodeBlock>
      <p><code>@plugger/preact</code> exposes the identical API for Preact.</p>

      <h2>Vue 3</h2>
      <CodeBlock lang="ts">{`import { providePlugger, PluggerSlot, usePluginStore } from "@plugger/vue";

// in a parent setup():
providePlugger(host);

// in any descendant:
const theme = usePluginStore((s) => s.theme);
// template: <PluggerSlot name="sidebar" />`}</CodeBlock>

      <h2>Web Components</h2>
      <CodeBlock lang="html">{`<plugger-slot name="sidebar"></plugger-slot>
<script type="module">
  import { definePluggerElements, setDefaultHost } from "@plugger/web-components";
  setDefaultHost(host);
  definePluggerElements();
</script>`}</CodeBlock>

      <h2>Vanilla JS</h2>
      <CodeBlock lang="ts">{`import { renderSlot } from "@plugger/vanilla";

const handle = renderSlot(host, "toolbar", document.querySelector("#toolbar"));
// handle.dispose() to stop and clean up`}</CodeBlock>

      <Callout type="info" title="They all share one engine">
        Every adapter delegates to <code>@plugger/vanilla</code>'s keyed{" "}
        <code>renderSlot</code>, so behaviour (ordering, diffing, cleanup) is
        identical everywhere.
      </Callout>

      <Pager
        prev={{ to: "/docs/commands", title: "Commands & Events" }}
        next={{ to: "/docs/api", title: "API Reference" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* API reference                                                         */
/* --------------------------------------------------------------------- */
export function ApiReference() {
  return (
    <article className="prose">
      <Eyebrow>Reference</Eyebrow>
      <h1>API reference</h1>
      <p className="lead">The complete public surface of <code>@plugger/core</code>.</p>

      <h2>createPluginHost(options)</h2>
      <CodeBlock lang="ts">{`interface PluginHostOptions<API, S> {
  state?: S | Store<S>;          // initial state or a prebuilt store
  api?: API;                     // services exposed to plugins
  slots?: string[];              // UI slot names to declare up front
  permissions?: PermissionPolicy;
  cdn?: "esm.sh" | "jsdelivr" | "skypack" | "unpkg";
  importer?: (url: string) => Promise<PluginModule>;
  storage?: KeyValueStorage;     // defaults to localStorage / memory
  logger?: Logger;               // defaults to console
  autoActivate?: boolean;        // default true
}`}</CodeBlock>

      <h3>Host methods</h3>
      <table>
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>load(source, opts?)</code></td><td>Resolve, import, register (and activate) a plugin.</td></tr>
          <tr><td><code>use(definition, opts?)</code></td><td>Register an in-memory plugin definition.</td></tr>
          <tr><td><code>activate(name)</code> / <code>deactivate(name)</code></td><td>Control lifecycle.</td></tr>
          <tr><td><code>remove(name)</code> / <code>destroy()</code></td><td>Unregister one / all plugins.</td></tr>
          <tr><td><code>list()</code> / <code>get(name)</code> / <code>status(name)</code></td><td>Inspect plugins.</td></tr>
          <tr><td><code>getSlot(name)</code> / <code>onSlotChange(fn, name?)</code></td><td>Read/observe UI contributions.</td></tr>
          <tr><td><code>store</code> / <code>commands</code> / <code>events</code></td><td>The shared registries.</td></tr>
          <tr><td><code>on(event, handler)</code></td><td>Host lifecycle events.</td></tr>
        </tbody>
      </table>

      <h2>definePlugin(definition)</h2>
      <p>Identity helper for type inference — see <Link to="/docs/plugin-authors">plugin developers</Link>.</p>

      <h2>createStore(initialState)</h2>
      <p>Standalone reactive store — see <Link to="/docs/state">State &amp; Store</Link>.</p>

      <h2>Host events</h2>
      <CodeBlock lang="ts">{`host.on("plugin:loaded", ({ name }) => {});
host.on("plugin:activated", ({ name }) => {});
host.on("plugin:deactivated", ({ name }) => {});
host.on("plugin:removed", ({ name }) => {});
host.on("plugin:error", ({ name, error }) => {});`}</CodeBlock>

      <Pager
        prev={{ to: "/docs/frameworks", title: "Framework Adapters" }}
        next={{ to: "/playground", title: "Playground" }}
      />
    </article>
  );
}

/* --------------------------------------------------------------------- */
/* Pager                                                                 */
/* --------------------------------------------------------------------- */
function Pager({
  prev,
  next,
}: {
  prev?: { to: string; title: string };
  next?: { to: string; title: string };
}) {
  return (
    <div className="pager">
      {prev ? (
        <Link to={prev.to} className="">
          <div className="dir">← Previous</div>
          <div className="ttl">{prev.title}</div>
        </Link>
      ) : (
        <span style={{ flex: 1 }} />
      )}
      {next ? (
        <Link to={next.to} className="next">
          <div className="dir">Next →</div>
          <div className="ttl">{next.title}</div>
        </Link>
      ) : (
        <span style={{ flex: 1 }} />
      )}
    </div>
  );
}
