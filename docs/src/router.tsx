import { useEffect, useState } from "react";

/** Minimal hash-based router — keeps the docs a single static bundle. */

export function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return hash || "/";
}

export function navigate(path: string): void {
  if (currentPath() === path) return;
  window.location.hash = path;
  window.scrollTo({ top: 0 });
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return path;
}

/** A router-aware link that updates the hash without a full navigation. */
export function Link({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
