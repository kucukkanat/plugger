import type { ComponentType } from "react";
import { Landing } from "./pages/Landing";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import { Examples } from "./pages/Examples";
import {
  ApiReference,
  AppAuthors,
  CommandsAndEvents,
  Concepts,
  Frameworks,
  Introduction,
  Permissions,
  PluginAuthors,
  Sources,
  StateAndStore,
} from "./pages/docs";

export interface PageDef {
  path: string;
  title: string;
  emoji?: string;
  group?: string;
  Component: ComponentType;
  /** Full-bleed pages render without the docs sidebar/TOC chrome. */
  chrome?: "docs" | "full" | "bare";
}

export const PAGES: PageDef[] = [
  { path: "/", title: "Home", Component: Landing, chrome: "bare" },

  { path: "/docs/introduction", title: "Introduction", emoji: "📖", group: "Getting Started", Component: Introduction },
  { path: "/docs/app-authors", title: "For App Authors", emoji: "🏗️", group: "Getting Started", Component: AppAuthors },
  { path: "/docs/plugin-authors", title: "For Plugin Developers", emoji: "🧩", group: "Getting Started", Component: PluginAuthors },

  { path: "/docs/concepts", title: "Architecture", emoji: "🏛️", group: "Core Concepts", Component: Concepts },
  { path: "/docs/sources", title: "Loading & Sources", emoji: "📦", group: "Core Concepts", Component: Sources },
  { path: "/docs/permissions", title: "Permissions", emoji: "🔐", group: "Core Concepts", Component: Permissions },
  { path: "/docs/state", title: "State & Store", emoji: "⚡", group: "Core Concepts", Component: StateAndStore },
  { path: "/docs/commands", title: "Commands & Events", emoji: "📣", group: "Core Concepts", Component: CommandsAndEvents },

  { path: "/docs/frameworks", title: "Framework Adapters", emoji: "🧱", group: "Adapters", Component: Frameworks },

  { path: "/docs/api", title: "API Reference", emoji: "📚", group: "Reference", Component: ApiReference },

  { path: "/playground", title: "Playground", emoji: "🎮", group: "Play", Component: PlaygroundPage, chrome: "full" },
  { path: "/examples", title: "Examples", emoji: "✨", group: "Play", Component: Examples },
];

export const GROUP_ORDER = [
  "Getting Started",
  "Core Concepts",
  "Adapters",
  "Reference",
  "Play",
];

/** Resolve a route path (including `/playground/<id>`) to a page. */
export function matchPage(path: string): PageDef {
  const exact = PAGES.find((p) => p.path === path);
  if (exact) return exact;
  if (path.startsWith("/playground")) return PAGES.find((p) => p.path === "/playground")!;
  return PAGES.find((p) => p.path === "/")!;
}
