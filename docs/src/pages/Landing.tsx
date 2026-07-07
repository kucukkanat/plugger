import { useState } from "react";
import { navigate } from "../router";
import { Playground } from "../playground/Playground";
import { HELLO } from "../examples/plugins";

export function Landing() {
  return (
    <div>
      <Hero />
      <section className="landing">
        <h2>Everything a plugin needs. Nothing it doesn't.</h2>
        <p className="section-sub">
          Plugger gives plugin authors a small, capability-scoped API to extend
          your app — and gives you full control over what they can touch.
        </p>
        <div className="grid cols-3">
          <Feature icon="🌐" title="Browser-native">
            Plugins load as standard ES modules via dynamic <code className="inline">import()</code>.
            No bundler, no transpiler, no server step in your app.
          </Feature>
          <Feature icon="📦" title="Load from anywhere">
            A URL, an npm package, or a GitHub repo. Plugger resolves it through
            a CDN and lazy-loads it on demand.
          </Feature>
          <Feature icon="🔐" title="Capability security">
            Plugins declare what they need — state, UI, commands, storage. You
            decide what's granted. Everything else throws.
          </Feature>
          <Feature icon="🧩" title="Any framework">
            React, Preact, Vue, Web Components, or vanilla JS. UI contributions
            speak DOM, so one plugin runs everywhere.
          </Feature>
          <Feature icon="⚡" title="Reactive by default">
            A tiny built-in store keeps the host and every plugin in sync with
            fine-grained selectors.
          </Feature>
          <Feature icon="🧠" title="End-to-end types">
            Publish your host contract and plugin authors get full autocomplete
            and type-checking against your state and services.
          </Feature>
        </div>
      </section>

      <section className="landing" style={{ paddingTop: 0 }}>
        <h2>Write a plugin. Watch it run.</h2>
        <p className="section-sub">
          This editor is real TypeScript with autocomplete and type-checking.
          Edit the code and press Run — it compiles and executes in your browser.
        </p>
        <Playground code={HELLO} title="hello-world.ts" />
      </section>

      <section className="landing" style={{ paddingTop: 0 }}>
        <h2>Three steps to an extensible app</h2>
        <div className="flow">
          <Step n={1} title="Create a host">
            Call <code className="inline">createPluginHost()</code> with your
            state, services, and the UI slots plugins may fill.
          </Step>
          <Step n={2} title="Render the slots">
            Drop <code className="inline">&lt;PluggerSlot&gt;</code> (or{" "}
            <code className="inline">renderSlot</code>) wherever plugins should
            appear in your UI.
          </Step>
          <Step n={3} title="Load plugins">
            <code className="inline">host.load("some-plugin")</code> — from npm,
            a URL, or GitHub. It activates and extends your app instantly.
          </Step>
        </div>
        <div style={{ textAlign: "center", marginTop: 34 }}>
          <a className="btn btn-primary" href="#/docs/introduction" onClick={linkNav}>
            Read the docs →
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        Plugger · MIT licensed · Built for the browser 🔌
      </footer>
    </div>
  );
}

function Hero() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText("npm install @plugger/core");
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="hero">
      <div className="hero-grid-bg" />
      <div className="hero-glow" />
      <span className="badge">
        <span className="dot" /> Browser-native · v0.1
      </span>
      <h1>
        Plugins for <span className="grad">any</span> web app.
      </h1>
      <p className="sub">
        Plugger is a meta framework for building plugin systems in the browser.
        Let other developers extend your SPA with lazily-loaded packages — no
        bundling, no transpilation, no rebuild.
      </p>
      <div className="cta">
        <a className="btn btn-primary" href="#/docs/introduction" onClick={linkNav}>
          Get started
        </a>
        <a className="btn btn-ghost" href="#/playground" onClick={linkNav}>
          ► Open playground
        </a>
      </div>
      <div className="install">
        <span className="prompt">$</span>
        <span>npm install @plugger/core</span>
        <button onClick={copy}>{copied ? "✓" : "⧉"}</button>
      </div>
    </div>
  );
}

function linkNav(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const href = e.currentTarget.getAttribute("href")!;
  navigate(href.slice(1));
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="cico">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="step">
      <div className="num">{n}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
