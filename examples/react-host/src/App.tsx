import { useState } from "react";
import {
  PluggerProvider,
  PluggerSlot,
  usePluginStore,
  usePlugins,
} from "@plugger/react";
import { host } from "./host";
import { formatPlugin, wordCountPlugin } from "./plugins";
import type { AppState } from "./host";

// Register the first-party plugins on startup.
void host.use(wordCountPlugin);
void host.use(formatPlugin);

export function App() {
  return (
    <PluggerProvider host={host}>
      <Shell />
    </PluggerProvider>
  );
}

function Shell() {
  const document = usePluginStore((s: AppState) => s.document);
  const notifications = usePluginStore((s: AppState) => s.notifications);
  const plugins = usePlugins();
  const [url, setUrl] = useState("");

  const loadRemote = async () => {
    if (!url.trim()) return;
    try {
      await host.load(url.trim());
    } catch (e) {
      alert(`Failed to load plugin: ${(e as Error).message}`);
    }
    setUrl("");
  };

  return (
    <div className="app">
      <header className="toolbar">
        <strong>📝 Acme Docs</strong>
        <PluggerSlot name="toolbar" />
        <span className="spacer" />
        <div className="loader">
          <input
            placeholder="npm name, URL, or github:owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadRemote()}
          />
          <button onClick={loadRemote}>Load plugin</button>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <h4>Panels</h4>
          <PluggerSlot name="sidebar" fallback={<em>No sidebar plugins</em>} />
          <h4>Installed</h4>
          <ul className="plugin-list">
            {plugins.map((p) => (
              <li key={p.name}>
                <span className={`dot ${p.status}`} /> {p.name}{" "}
                <small>{p.status}</small>
              </li>
            ))}
          </ul>
        </aside>

        <main className="content">
          <p>{document}</p>
          {notifications.length > 0 && (
            <div className="toasts">
              {notifications.map((n, i) => (
                <div className="toast" key={i}>
                  🔔 {n}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <footer className="statusbar">
        <PluggerSlot name="statusbar" />
      </footer>
    </div>
  );
}
