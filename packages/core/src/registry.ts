import type {
  CommandDefinition,
  Disposable,
  RegisteredCommand,
  UIContribution,
  UIContributionSpec,
  Unsubscribe,
} from "./types.js";

export class CommandError extends Error {
  override name = "CommandError";
}

/** Central registry of commands contributed by the host and its plugins. */
export class CommandRegistry {
  private readonly commands = new Map<string, RegisteredCommand>();
  private readonly listeners = new Set<() => void>();

  register(command: CommandDefinition, owner: string): Disposable {
    if (this.commands.has(command.id)) {
      throw new CommandError(
        `Command "${command.id}" is already registered (owner: ${
          this.commands.get(command.id)!.owner
        }).`,
      );
    }
    this.commands.set(command.id, { ...command, owner } as RegisteredCommand);
    this.notify();
    return {
      dispose: () => {
        if (this.commands.delete(command.id)) this.notify();
      },
    };
  }

  execute<R = unknown>(id: string, ...args: unknown[]): R {
    const command = this.commands.get(id);
    if (!command) throw new CommandError(`Unknown command: "${id}".`);
    return command.run(...args) as R;
  }

  has(id: string): boolean {
    return this.commands.has(id);
  }

  get(id: string): RegisteredCommand | undefined {
    return this.commands.get(id);
  }

  list(): RegisteredCommand[] {
    return [...this.commands.values()];
  }

  /** Remove every command owned by `owner` (used on plugin deactivate). */
  removeOwner(owner: string): void {
    let changed = false;
    for (const [id, cmd] of this.commands) {
      if (cmd.owner === owner) {
        this.commands.delete(id);
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  onChange(listener: () => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of [...this.listeners]) l();
  }
}

/** Registry of UI contributions, grouped by slot and kept in `order`. */
export class UIRegistry {
  private readonly slots = new Map<string, UIContribution[]>();
  private readonly declared = new Set<string>();
  private readonly listeners = new Set<(slot: string) => void>();
  private counter = 0;

  constructor(declaredSlots: string[] = []) {
    for (const slot of declaredSlots) this.declared.add(slot);
  }

  declareSlot(slot: string): void {
    if (!this.declared.has(slot)) {
      this.declared.add(slot);
      if (!this.slots.has(slot)) this.slots.set(slot, []);
    }
  }

  slotNames(): string[] {
    return [...new Set([...this.declared, ...this.slots.keys()])];
  }

  contribute(slot: string, spec: UIContributionSpec, owner: string): Disposable {
    const contribution: UIContribution = {
      id: spec.id ?? `${owner}:${slot}:${this.counter++}`,
      slot,
      owner,
      order: spec.order ?? 0,
      meta: spec.meta ?? {},
      mount: spec.mount,
    };
    const list = this.slots.get(slot) ?? [];
    list.push(contribution);
    list.sort((a, b) => a.order - b.order);
    this.slots.set(slot, list);
    this.notify(slot);
    return {
      dispose: () => {
        const current = this.slots.get(slot);
        if (!current) return;
        const idx = current.indexOf(contribution);
        if (idx >= 0) {
          current.splice(idx, 1);
          this.notify(slot);
        }
      },
    };
  }

  get(slot: string): UIContribution[] {
    return [...(this.slots.get(slot) ?? [])];
  }

  /** Remove every contribution owned by `owner` across all slots. */
  removeOwner(owner: string): void {
    for (const [slot, list] of this.slots) {
      const next = list.filter((c) => c.owner !== owner);
      if (next.length !== list.length) {
        this.slots.set(slot, next);
        this.notify(slot);
      }
    }
  }

  onChange(listener: (slot: string) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(slot: string): void {
    for (const l of [...this.listeners]) l(slot);
  }
}
