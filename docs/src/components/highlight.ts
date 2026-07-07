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

export function highlight(code: string, lang = "ts"): string {
  if (lang === "bash" || lang === "sh" || lang === "shell") return highlightBash(code);
  return highlightTs(code);
}

function highlightBash(code: string): string {
  return escapeHtml(code)
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("#")) return `<span class="tok-com">${line}</span>`;
      return line.replace(
        /^(\s*)(npm|pnpm|yarn|npx|node|git|cd|curl)\b/,
        '$1<span class="tok-fn">$2</span>',
      );
    })
    .join("\n");
}

function highlightTs(code: string): string {
  const tokens: string[] = [];
  let i = 0;
  const n = code.length;

  const push = (cls: string | null, text: string) => {
    const safe = escapeHtml(text);
    tokens.push(cls ? `<span class="${cls}">${safe}</span>` : safe);
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
      push("tok-str", code.slice(i, j));
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
      if (KEYWORDS.has(word)) push("tok-key", word);
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
