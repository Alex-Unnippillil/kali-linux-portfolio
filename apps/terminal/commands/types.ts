export interface CommandContext {
  writeLine: (text: string) => void;
  files: Record<string, string>;
  history: string[];
  aliases: Record<string, string>;
  setAlias: (name: string, value: string) => void;
  runWorker: (command: string) => Promise<void>;
  openManPage: (
    name: string,
    sections: { synopsis: string; description: string },
  ) => void;
}

export type CommandHandler = (args: string, ctx: CommandContext) => void | Promise<void>;
