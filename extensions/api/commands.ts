export type CommandExecutor = (...args: unknown[]) => unknown | Promise<unknown>;

export interface CommandShortcut {
  /** Platform-agnostic shortcut description (e.g. "Ctrl+P"). */
  default?: string;
  /** macOS specific shortcut (e.g. "⌘P"). */
  mac?: string;
  /** Windows specific shortcut. */
  windows?: string;
  /** Linux specific shortcut. */
  linux?: string;
}

export interface RegisterCommandOptions {
  /** Unique command identifier. */
  id: string;
  /** Human-readable label shown in the command palette. */
  label: string;
  /** Optional category grouping. */
  category?: string;
  /** Keyboard shortcut metadata. */
  shortcut?: CommandShortcut;
  /** Function that executes when the command is invoked. */
  run: CommandExecutor;
  /**
   * Identifier of the extension that registered the command. If omitted the
   * command is treated as a core contribution.
   */
  extensionId?: string;
  /** Optional friendly name for the badge in the palette. */
  source?: string;
}

export interface RegisteredCommand extends RegisterCommandOptions {
  /**
   * Badge label rendered in the command palette. Defaults to `Core` for
   * internal commands or the provided `extensionId`.
   */
  badge: string;
}

export type CommandsChangedListener = (commands: RegisteredCommand[]) => void;

const registry = new Map<string, RegisteredCommand>();
const extensionIndex = new Map<string, Set<string>>();
const listeners = new Set<CommandsChangedListener>();

function getBadgeFor(options: RegisterCommandOptions): string {
  if (options.source) return options.source;
  if (options.extensionId) return options.extensionId;
  return 'Core';
}

function notifyListeners() {
  const commands = getAllCommands();
  listeners.forEach((listener) => listener(commands));
}

export function registerCommand(options: RegisterCommandOptions): () => void {
  const { id, extensionId } = options;
  if (!id) {
    throw new Error('Command id is required');
  }
  if (registry.has(id)) {
    throw new Error(`Command with id "${id}" is already registered`);
  }
  const record: RegisteredCommand = {
    ...options,
    badge: getBadgeFor(options),
  };
  registry.set(id, record);
  if (extensionId) {
    let commands = extensionIndex.get(extensionId);
    if (!commands) {
      commands = new Set();
      extensionIndex.set(extensionId, commands);
    }
    commands.add(id);
  }
  notifyListeners();
  return () => unregisterCommand(id);
}

export function registerExtensionCommand(
  extensionId: string,
  options: Omit<RegisterCommandOptions, 'extensionId'>,
): () => void {
  return registerCommand({ ...options, extensionId });
}

export function unregisterCommand(id: string): void {
  const existing = registry.get(id);
  if (!existing) return;
  registry.delete(id);
  if (existing.extensionId) {
    const commands = extensionIndex.get(existing.extensionId);
    commands?.delete(id);
    if (commands && commands.size === 0) {
      extensionIndex.delete(existing.extensionId);
    }
  }
  notifyListeners();
}

export function unregisterExtensionCommands(extensionId: string): void {
  const commands = extensionIndex.get(extensionId);
  if (!commands) return;
  commands.forEach((id) => registry.delete(id));
  extensionIndex.delete(extensionId);
  notifyListeners();
}

export function executeCommand(id: string, ...args: unknown[]): unknown {
  const command = registry.get(id);
  if (!command) {
    throw new Error(`Command "${id}" is not registered`);
  }
  return command.run(...args);
}

export function getAllCommands(): RegisteredCommand[] {
  return Array.from(registry.values()).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
}

export function onCommandsChanged(
  listener: CommandsChangedListener,
): () => void {
  listeners.add(listener);
  listener(getAllCommands());
  return () => listeners.delete(listener);
}
