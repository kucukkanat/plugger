import { createPluginHost, type HostContract } from "@plugger/core";

/** The application state plugins may read (and, if permitted, write). */
export interface AppState {
  document: string;
  wordCount: number;
  theme: "light" | "dark";
  notifications: string[];
}

/** The services this app exposes to plugins under `ctx.api`. */
export interface AppApi {
  notify(message: string): void;
  formatDocument(): void;
}

/** Publish this contract so plugin authors get end-to-end types. */
export type AcmeContract = HostContract<AppApi, AppState>;

export const host = createPluginHost<AppApi, AppState>({
  state: {
    document: "The quick brown fox jumps over the lazy dog.",
    wordCount: 9,
    theme: "light",
    notifications: [],
  },
  api: {
    notify(message) {
      host.store.setState((s) => ({
        notifications: [...s.notifications, message],
      }));
    },
    formatDocument() {
      host.store.setState((s) => ({ document: s.document.trim() }));
    },
  },
  slots: ["toolbar", "sidebar", "statusbar"],
  // A conservative default policy: everyone can read state; anything else must
  // be declared by the plugin (and is trusted here for the demo).
  permissions: { default: ["state:read"] },
});
