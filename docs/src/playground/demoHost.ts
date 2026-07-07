import { createPluginHost, createStore, type Logger, type PluginHost } from "@plugger/core";

export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export interface DemoState {
  title: string;
  words: number;
  theme: "light" | "dark";
  todos: Todo[];
  unread: number;
}

export interface DemoApi {
  notify(message: string): void;
  addTodo(text: string): Todo;
  shout(text: string): string;
}

export type LogLevel = "debug" | "info" | "warn" | "error" | "event";

export interface LogEntry {
  level: LogLevel;
  message: string;
}

export interface DemoHost {
  host: PluginHost<DemoApi, DemoState>;
  logs: LogEntry[];
  onLog?: (entry: LogEntry) => void;
}

const initialState = (): DemoState => ({
  title: "Untitled document",
  words: 128,
  theme: "light",
  todos: [
    { id: 1, text: "Try editing the plugin", done: false },
    { id: 2, text: "Press Run", done: true },
  ],
  unread: 0,
});

function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Build an isolated demo host for a playground run. Every run gets a fresh
 * host + state so examples never leak into one another.
 */
export function createDemoHost(onLog?: (entry: LogEntry) => void): DemoHost {
  const logs: LogEntry[] = [];
  const emit = (level: LogLevel, args: unknown[]) => {
    const entry: LogEntry = { level, message: args.map(serialize).join(" ") };
    logs.push(entry);
    onLog?.(entry);
  };

  const logger: Logger = {
    debug: (...a) => emit("debug", a),
    info: (...a) => emit("info", a),
    warn: (...a) => emit("warn", a),
    error: (...a) => emit("error", a),
  };

  const store = createStore<DemoState>(initialState());

  const api: DemoApi = {
    notify(message) {
      store.setState((s) => ({ unread: s.unread + 1 }));
      emit("event", [`🔔 notify(): ${message}`]);
    },
    addTodo(text) {
      const todo: Todo = { id: Date.now() % 100000, text, done: false };
      store.setState((s) => ({ todos: [...s.todos, todo] }));
      emit("event", [`✅ addTodo(): "${text}"`]);
      return todo;
    },
    shout(text) {
      return text.toUpperCase() + "!";
    },
  };

  const host = createPluginHost<DemoApi, DemoState>({
    state: store,
    api,
    slots: ["toolbar", "sidebar", "content", "statusbar"],
    logger,
    // Trust each plugin's declared permissions in the sandboxed playground.
    permissions: {},
  });

  // Surface plugin lifecycle + custom events into the console for visibility.
  host.on("plugin:activated", (p) =>
    emit("event", [`▶ activated "${(p as { name: string }).name}"`]),
  );
  host.on("plugin:error", (p) => {
    const { name, error } = p as { name: string; error: Error };
    emit("error", [`plugin "${name}" failed: ${error.message}`]);
  });

  return { host, logs, onLog };
}
