import type { TerminalFileSystem } from '../utils/filesystem';

export interface CommandContext {
  writeLine: (text: string) => void;
  /** @deprecated use fs instead */
  files: Record<string, string>;
  fs: TerminalFileSystem;
  cwd: string;
  setCwd: (path: string) => void;
  history: string[];
  aliases: Record<string, string>;
  setAlias: (name: string, value: string) => void;
  runWorker: (command: string) => Promise<void>;
  clear: () => void;
  openApp?: (id: string) => void;
  listCommands: () => CommandDefinition[];
  getTermCols?: () => number | undefined;
}

export type CommandHandler = (args: string, ctx: CommandContext) => void | Promise<void>;

export interface CommandDefinition {
  name: string;
  description: string;
  usage?: string;
  handler: CommandHandler;
}
