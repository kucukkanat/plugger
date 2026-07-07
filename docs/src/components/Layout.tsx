import { useEffect, useRef, useState } from "react";
import { Link, navigate, useRoute } from "../router";
import { GROUP_ORDER, matchPage, PAGES } from "../site";
import { useTheme } from "../theme";

const GH_URL = "https://github.com/kucukkanat/plugger";

export function Layout() {
  const route = useRoute();
  const page = matchPage(route);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [route]);

  const Component = page.Component;

  return (
    <>
      <Header onMenu={() => setMenuOpen((o) => !o)} />
      {page.chrome === "bare" ? (
        <Component />
      ) : page.chrome === "full" ? (
        <Component />
      ) : (
        <div className="layout">
          {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
          <Sidebar open={menuOpen} activePath={route} />
          <div className="content-wrap">
            <main className="content">
              <Component />
            </main>
            <Toc route={route} />
          </div>
        </div>
      )}
    </>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const route = useRoute();
  const isActive = (p: string) => route.startsWith(p);
  return (
    <header className="header">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu">
        ☰
      </button>
      <Link to="/" className="brand">
        <span className="logo">🔌</span>
        Plugger
        <span className="tag">v0.1</span>
      </Link>
      <nav>
        <a
          href="#/docs/introduction"
          className={isActive("/docs") ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/docs/introduction");
          }}
        >
          Docs
        </a>
        <a
          href="#/playground"
          className={isActive("/playground") ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/playground");
          }}
        >
          Playground
        </a>
        <a
          href="#/examples"
          className={isActive("/examples") ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/examples");
          }}
        >
          Examples
        </a>
      </nav>
      <span className="spacer" />
      <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      <a className="gh-link" href={GH_URL} target="_blank" rel="noreferrer">
        <span>★</span> GitHub
      </a>
    </header>
  );
}

function Sidebar({ open, activePath }: { open: boolean; activePath: string }) {
  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    pages: PAGES.filter((p) => p.group === g),
  })).filter((g) => g.pages.length > 0);

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      {groups.map((group) => (
        <div className="group" key={group.name}>
          <div className="group-title">{group.name}</div>
          {group.pages.map((p) => (
            <Link
              key={p.path}
              to={p.path}
              className={activePath.startsWith(p.path) && p.path !== "/" ? "active" : ""}
            >
              <span className="emoji">{p.emoji}</span>
              {p.title}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

function Toc({ route }: { route: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const raf = useRef<number>();

  // Collect headings after the page renders.
  useEffect(() => {
    const collect = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(".content h2, .content h3"),
      );
      const hs: Heading[] = nodes.map((n, i) => {
        if (!n.id) n.id = slug(n.textContent ?? `h-${i}`);
        return {
          id: n.id,
          text: n.textContent ?? "",
          level: n.tagName === "H2" ? 2 : 3,
        };
      });
      setHeadings(hs);
    };
    // Wait a frame for content to mount.
    raf.current = requestAnimationFrame(collect);
    return () => cancelAnimationFrame(raf.current!);
  }, [route]);

  // Scroll-spy.
  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return <div className="toc" />;

  return (
    <nav className="toc">
      <div className="toc-title">On this page</div>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={`${h.level === 3 ? "lvl-3" : ""} ${activeId === h.id ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
            history.replaceState(null, "", `${window.location.hash}`);
          }}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
