import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Site-wide "which framework are you using" preference. Plugger's core is
 * framework-agnostic, so what actually changes between frameworks is the
 * host-integration code (provider setup, slot rendering, hooks/composables).
 * A single global choice — persisted and mirrored onto <html data-framework>
 * — keeps every snippet on the site in sync, and per-block tabs write back to
 * it so switching anywhere switches everywhere.
 */

export type Framework = "react" | "vue" | "vanilla" | "web-components";

export interface FrameworkMeta {
  id: Framework;
  label: string;
  /** The adapter package a consumer installs. */
  pkg: string;
  /** Accent used for the code-block dot, echoing the framework's brand. */
  dot: string;
}

export const FRAMEWORKS: readonly FrameworkMeta[] = [
  { id: "react", label: "React", pkg: "@plugger/react", dot: "#61dafb" },
  { id: "vue", label: "Vue", pkg: "@plugger/vue", dot: "#42b883" },
  { id: "vanilla", label: "Vanilla JS", pkg: "@plugger/vanilla", dot: "#f7df1e" },
  {
    id: "web-components",
    label: "Web Components",
    pkg: "@plugger/web-components",
    dot: "#e34c26",
  },
];

const DEFAULT: Framework = "react";
const STORAGE_KEY = "plugger-framework";

const isFramework = (v: string): v is Framework =>
  FRAMEWORKS.some((f) => f.id === v);

export const frameworkMeta = (id: Framework): FrameworkMeta =>
  FRAMEWORKS.find((f) => f.id === id) ?? FRAMEWORKS[0];

interface FrameworkCtx {
  framework: Framework;
  setFramework: (f: Framework) => void;
}
const Ctx = createContext<FrameworkCtx>({
  framework: DEFAULT,
  setFramework: () => {},
});

function initialFramework(): Framework {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && isFramework(saved) ? saved : DEFAULT;
}

export function FrameworkProvider({ children }: { children: ReactNode }) {
  const [framework, setFramework] = useState<Framework>(initialFramework);
  useEffect(() => {
    document.documentElement.dataset.framework = framework;
    localStorage.setItem(STORAGE_KEY, framework);
  }, [framework]);
  return (
    <Ctx.Provider value={{ framework, setFramework }}>{children}</Ctx.Provider>
  );
}

export const useFramework = () => useContext(Ctx);
