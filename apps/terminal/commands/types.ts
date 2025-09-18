export interface CommandContext {
  writeLine: (text: string) => void;
  files: Record<string, string>;
  history: string[];
  aliases: Record<string, string>;
  setAlias: (name: string, value: string) => void;
  runWorker: (command: string) => Promise<void>;
  cwd: string;
  setCwd: (dir: string) => void;
}

export type CommandHandler = (args: string, ctx: CommandContext) => void | Promise<void>;
