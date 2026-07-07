/**
 * A tiny, dependency-free syntax highlighter for static code blocks. Not a full
 * parser — just enough tokenisation (comments, strings, numbers, keywords,
 * calls) to make TypeScript/JS/bash snippets readable. Live editors use Monaco.
 */
const KEYWORDS = new Set([
  "import", "export", "from", "default", "const", "let", "var", "function",
  "return", "if", "else", "for", "while", "await", "async", "new", "class",
  "extends", "implements", "interface", "type", "enum", "public", "private",
  "protected", "readonly", "static", "of", "in", "instanceof", "typeof", "as",
  "void", "null", "undefined", "true", "false", "this", "super", "throw", "try",
  "catch", "finally", "switch", "case", "break", "continue", "yield", "declare",
  "namespace", "abstract", "get", "set", "satisfies", "keyof", "infer",
]);

const escapeHtml = (s: string): string =>
  s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

/**
 * Optionally, a `linkMap` maps a token's exact text (an identifier, or the
 * inner text of a string literal) to a stable link id. Matching tokens are
 * wrapped in `<span class="tok-link" data-link="id">` so a UI layer can
 * cross-highlight related code across panes on hover.
 */
export function highlight(
  code: string,
  lang = "ts",
  linkMap?: Record<string, string>,
): string {
  if (lang === "bash" || lang === "sh" || lang === "shell") return highlightBash(code);
  return highlightTs(code, linkMap);
}

function highlightBash(code: string): string {
  return escapeHtml(code)
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("#")) return `<span class="tok-com">${line}</span>`;
      return line.replace(
        /^(\s*)(bun|bunx|npm|pnpm|yarn|npx|node|git|cd|curl)\b/,
        '$1<span class="tok-fn">$2</span>',
      );
    })
    .join("\n");
}

function highlightTs(code: string, linkMap?: Record<string, string>): string {
  const tokens: string[] = [];
  let i = 0;
  const n = code.length;

  const push = (cls: string | null, text: string) => {
    const safe = escapeHtml(text);
    tokens.push(cls ? `<span class="${cls}">${safe}</span>` : safe);
  };

  const pushLinked = (cls: string | null, text: string, id: string) => {
    const safe = escapeHtml(text);
    const classes = `${cls ? `${cls} ` : ""}tok-link`;
    tokens.push(`<span class="${classes}" data-link="${id}">${safe}</span>`);
  };

  while (i < n) {
    const ch = code[i];
    const rest = code.slice(i);

    // Line comment
    if (ch === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      push("tok-com", code.slice(i, stop));
      i = stop;
      continue;
    }
    // Block comment
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      push("tok-com", code.slice(i, stop));
      i = stop;
      continue;
    }
    // Strings (single, double, template)
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < n && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      j = Math.min(j + 1, n);
      const str = code.slice(i, j);
      const inner = str.length >= 2 ? str.slice(1, -1) : str;
      const strId = linkMap?.[inner];
      if (strId) pushLinked("tok-str", str, strId);
      else push("tok-str", str);
      i = j;
      continue;
    }
    // Numbers
    if (/[0-9]/.test(ch!) && !/[a-zA-Z_$]/.test(code[i - 1] ?? "")) {
      const m = rest.match(/^0x[0-9a-fA-F]+|^\d[\d_]*\.?\d*([eE][+-]?\d+)?/);
      if (m) {
        push("tok-num", m[0]);
        i += m[0].length;
        continue;
      }
    }
    // Identifiers / keywords
    if (/[a-zA-Z_$]/.test(ch!)) {
      const m = rest.match(/^[a-zA-Z_$][\w$]*/)!;
      const word = m[0];
      const after = code.slice(i + word.length).match(/^\s*\(/);
      const wordId = linkMap?.[word];
      if (KEYWORDS.has(word)) push("tok-key", word);
      else if (wordId) pushLinked(after ? "tok-fn" : null, word, wordId);
      else if (after) push("tok-fn", word);
      else push(null, word);
      i += word.length;
      continue;
    }
    // Punctuation-ish
    push(null, ch!);
    i++;
  }
  return tokens.join("");
}
