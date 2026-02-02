import type { CommandContext, CommandDefinition, CommandHandler } from './types';
import projectsData from '../../../data/projects.json';
import registry from './registry';

// Re-export registry for use by Terminal App
export { default as commandRegistry } from './registry';
export * from './types';
export const getCommandList = () => registry.getAll();

async function man(args: string, ctx: CommandContext) {
  const name = args.trim();
  if (!name) {
    ctx.writeLine('usage: man <command>');
    return;
  }
  const loaders: Record<string, () => Promise<string>> = {
    alias: () => fetch(new URL('../man/alias.txt', import.meta.url)).then((r) => r.text()),
    cat: () => fetch(new URL('../man/cat.txt', import.meta.url)).then((r) => r.text()),
    grep: () => fetch(new URL('../man/grep.txt', import.meta.url)).then((r) => r.text()),
    history: () => fetch(new URL('../man/history.txt', import.meta.url)).then((r) => r.text()),
    jq: () => fetch(new URL('../man/jq.txt', import.meta.url)).then((r) => r.text()),
    man: () => fetch(new URL('../man/man.txt', import.meta.url)).then((r) => r.text()),
    open: () => fetch(new URL('../man/open.txt', import.meta.url)).then((r) => r.text()),
    projects: () => fetch(new URL('../man/projects.txt', import.meta.url)).then((r) => r.text()),
    rm: () => fetch(new URL('../man/rm.txt', import.meta.url)).then((r) => r.text()),
    ssh: () => fetch(new URL('../man/ssh.txt', import.meta.url)).then((r) => r.text()),
    sudo: () => fetch(new URL('../man/sudo.txt', import.meta.url)).then((r) => r.text()),
    whoami: () => fetch(new URL('../man/whoami.txt', import.meta.url)).then((r) => r.text()),
  };
  const loader = loaders[name];
  if (loader) ctx.writeLine(await loader());
  else ctx.writeLine(`No manual entry for ${name}`);
}

function history(_args: string, ctx: CommandContext) {
  ctx.history.forEach((cmd, i) => ctx.writeLine(`${i + 1}  ${cmd}`));
}

function alias(args: string, ctx: CommandContext) {
  if (!args) {
    Object.entries(ctx.aliases).forEach(([k, v]) => ctx.writeLine(`${k}='${v}'`));
    return;
  }
  const [name, value] = args.split('=');
  if (value) {
    ctx.setAlias(name.trim(), value.trim());
  } else {
    const existing = ctx.aliases[name.trim()];
    if (existing) ctx.writeLine(`${name}='${existing}'`);
  }
}

const help: CommandHandler = (args, ctx) => {
  const termWidth = 80;
  const commands = ctx.listCommands();
  const query = args.trim();
  if (query) {
    const cmd = commands.find((c) => c.name === query);
    if (cmd) {
      ctx.writeLine(`${cmd.name} - ${cmd.description}`);
      if (cmd.usage) ctx.writeLine(`usage: ${cmd.usage}`);
    } else {
      ctx.writeLine(`Unknown command: ${query}`);
    }
    return;
  }

  ctx.writeLine('Available commands (type "help <command>" for details):');
  for (const { name, description } of commands) {
    const padded = `${name}${' '.repeat(Math.max(2, 16 - name.length))}`;
    const line = `${padded}${description}`;
    ctx.writeLine(line.slice(0, termWidth));
  }
  ctx.writeLine(
    'Example scripts: https://github.com/unnippillil/kali-linux-portfolio/tree/main/scripts/examples',
  );
};

const ls: CommandHandler = async (_args, ctx) => {
  const targetPath = _args.trim() ? ctx.fs.resolvePath(ctx.cwd, _args.trim()) : ctx.cwd;
  const entries = await ctx.fs.readDirectory(targetPath);

  if (!entries) {
    ctx.writeLine(`ls: cannot access '${_args.trim()}': No such file or directory`);
    return;
  }

  const output = entries.map(e => e.kind === 'directory' ? `\x1b[1;34m${e.name}/\x1b[0m` : e.name).join('  ');
  ctx.writeLine(output);
};

const cd: CommandHandler = async (args, ctx) => {
  const target = args.trim() || '~';
  const resolved = ctx.fs.resolvePath(ctx.cwd, target);

  // Check if exists and is directory
  const exists = await ctx.fs.getHandle(resolved);
  if (!exists || exists.kind !== 'directory') {
    ctx.writeLine(`cd: ${target}: No such file or directory`);
    return;
  }
  ctx.setCwd(resolved);
};

const pwd: CommandHandler = (_args, ctx) => {
  ctx.writeLine(ctx.cwd);
};

const mkdir: CommandHandler = async (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('usage: mkdir <directory>');
    return;
  }
  const resolved = ctx.fs.resolvePath(ctx.cwd, target);
  const success = await ctx.fs.createDirectory(resolved);
  if (!success) {
    ctx.writeLine(`mkdir: cannot create directory '${target}': File exists or error`);
  }
};

const touch: CommandHandler = async (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('usage: touch <file>');
    return;
  }
  const resolved = ctx.fs.resolvePath(ctx.cwd, target);
  const success = await ctx.fs.writeFile(resolved, ''); // Create empty file
  if (!success) {
    ctx.writeLine(`touch: cannot create file '${target}'`);
  }
};

const cat: CommandHandler = async (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('Usage: cat <file>');
    return;
  }

  const resolved = ctx.fs.resolvePath(ctx.cwd, target);
  const content = await ctx.fs.readFile(resolved);

  if (content !== null) {
    ctx.writeLine(content);
    return;
  }

  ctx.writeLine(`cat: ${target}: No such file or directory`);
};

const clear: CommandHandler = (_args, ctx) => {
  ctx.clear();
};

const open: CommandHandler = (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('Usage: open <app>');
    return;
  }
  // Remove file extension if present (e.g., spotify.app -> spotify) - just in case
  const appId = target.replace(/\.(app|exe|sh)$/, '');

  if (ctx.openApp) {
    ctx.openApp(appId);
    ctx.writeLine(`Opening ${appId}...`);
  } else {
    ctx.writeLine('Error: Desktop environment not connected (openApp missing).');
  }
};

const projects: CommandHandler = (_args, ctx) => {
  const projects = projectsData as Array<{
    title: string;
    description: string;
    demo?: string;
    repo?: string;
  }>;
  ctx.writeLine('Projects catalog (demo data):');
  projects.forEach((project) => {
    const links = [project.demo, project.repo].filter(Boolean).join(' • ');
    const linkLine = links ? ` (${links})` : '';
    ctx.writeLine(`- ${project.title}: ${project.description}${linkLine}`);
  });
  ctx.writeLine('Tip: run "open project-gallery" to explore the full gallery.');
};

const ssh: CommandHandler = (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('usage: ssh <user@host>');
    return;
  }
  ctx.writeLine(`Connecting to ${target}...`);
  ctx.writeLine('Negotiating keys... ok');
  ctx.writeLine('Welcome to the demo bastion. All output is simulated.');
  ctx.writeLine('> uptime');
  ctx.writeLine('  10:42:11 up 42 days, 03:12, 2 users, load average: 0.04, 0.09, 0.12');
  ctx.writeLine('> ls /ops');
  ctx.writeLine('  runbooks  incident-briefs  training');
  ctx.writeLine('Connection closed (simulation).');
};

const whoami: CommandHandler = (_args, ctx) => {
  ctx.writeLine('guest@kali-portfolio');
};

const sudo: CommandHandler = async (args, ctx) => {
  const commandLine = args.trim();
  if (!commandLine) {
    ctx.writeLine('usage: sudo <command>');
    return;
  }
  if (commandLine.includes('rm -rf /') || commandLine.includes('rm --no-preserve-root')) {
    ctx.writeLine('sudo: refusing to delete /. This is a safe demo terminal.');
    return;
  }
  if (commandLine.startsWith('open ')) {
    open(commandLine.replace(/^open\s+/, ''), ctx);
    return;
  }

  const [cmdName, ...cmdArgs] = commandLine.split(' ');
  const cmd = registry.get(cmdName);
  if (cmd) {
    await cmd.handler(cmdArgs.join(' '), ctx);
    return;
  }

  ctx.writeLine(
    ctx.safeMode
      ? `sudo: "${commandLine}" skipped (safe mode is enabled).`
      : `sudo: simulated privilege escalation for "${commandLine}".`,
  );
};

const rm: CommandHandler = async (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('usage: rm <path>');
    return;
  }

  if (target === '/' || target === '/home' || target === '/etc' || target === '/var') {
    ctx.writeLine(`rm: cannot remove '${target}': Permission denied`);
    return;
  }

  const resolved = ctx.fs.resolvePath(ctx.cwd, target);
  const success = await ctx.fs.deleteEntry(resolved);

  if (!success) {
    ctx.writeLine(`rm: cannot remove '${target}': No such file or directory`);
  }
};

const about: CommandHandler = (_args, ctx) => {
  ctx.writeLine('This terminal is powered by xterm.js');
};

const date: CommandHandler = (_args, ctx) => {
  ctx.writeLine(new Date().toString());
};

const registerAll = () => {
  const list: CommandDefinition[] = [
    { name: 'help', description: 'Show this index or details for a single command.', usage: 'help [command]', handler: help },
    { name: 'man', description: 'Read the simulated manual pages.', usage: 'man <command>', handler: man },
    { name: 'history', description: 'Print command history for this session.', handler: history },
    { name: 'alias', description: 'Create or list aliases.', usage: "alias [name]='value'", handler: alias },
    { name: 'ls', description: 'List files and directories.', handler: ls },
    { name: 'cd', description: 'Change directory.', handler: cd },
    { name: 'pwd', description: 'Print working directory.', handler: pwd },
    { name: 'mkdir', description: 'Create a directory.', handler: mkdir },
    { name: 'touch', description: 'Create a file.', handler: touch },
    { name: 'cat', description: 'Print a file.', usage: 'cat <file>', handler: cat },
    { name: 'clear', description: 'Clear the terminal buffer.', handler: clear },
    { name: 'open', description: 'Open another desktop app.', usage: 'open <app-id>', handler: open },
    { name: 'projects', description: 'List the portfolio project catalog.', handler: projects },
    {
      name: 'ssh',
      description: 'Start a simulated SSH session.',
      usage: 'ssh <user@host>',
      handler: ssh,
      safeModeBypass: true,
    },
    { name: 'whoami', description: 'Print the current demo user.', handler: whoami },
    { name: 'sudo', description: 'Execute a command with elevated privileges.', usage: 'sudo <command>', handler: sudo },
    { name: 'rm', description: 'Remove a file or directory.', usage: 'rm <path>', handler: rm },
    { name: 'about', description: 'Show information about this terminal.', handler: about },
    { name: 'date', description: 'Print the current date.', handler: date },
    { name: 'grep', description: 'Search through text.', usage: 'grep <pattern> [file]', handler: (args, ctx) => ctx.runWorker(`grep ${args}`) },
    { name: 'jq', description: 'Filter JSON input.', usage: 'jq <path> [file]', handler: (args, ctx) => ctx.runWorker(`jq ${args}`) },
  ];

  list.forEach(cmd => registry.register(cmd));
};

registerAll();

export default registry;
