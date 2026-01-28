'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTab } from '../../components/ui/TabbedWindow';
import commandRegistry, { CommandContext, getCommandList } from './commands';

const files: Record<string, string> = {
  'README.md': 'Welcome to the web terminal.\nThis is a fake file used for demos.',
};

export interface TerminalProps {
  openApp?: (id: string) => void;
}

const TerminalApp = ({ openApp }: TerminalProps) => {
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const tab = useTab();

  const writeLine = useCallback((text: string) => {
    setOutputLines((prev) => [...prev, text]);
  }, []);

  const runWorker = useCallback(
    async (command: string) => {
      const name = command.trim().split(' ')[0] || 'command';
      writeLine(`"${name}" is not available in the lightweight terminal.`);
    },
    [writeLine],
  );

  const executeCommand = useCallback(
    async (input: string, historyOverride?: string[]) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      const [cmd, ...rest] = trimmed.split(' ');
      const aliasValue = aliases[cmd];
      const resolvedInput = aliasValue
        ? `${aliasValue}${rest.length ? ` ${rest.join(' ')}` : ''}`
        : trimmed;
      const [resolvedCmd, ...argsArr] = resolvedInput.split(' ');
      const args = argsArr.join(' ');
      const commandDef = commandRegistry[resolvedCmd];

      if (!commandDef) {
        writeLine(`Command not found: ${cmd}`);
        return;
      }

      const ctx: CommandContext = {
        writeLine,
        files,
        history: historyOverride ?? history,
        aliases,
        safeMode: true,
        setAlias: (name, value) =>
          setAliases((prev) => ({
            ...prev,
            [name]: value,
          })),
        runWorker,
        clear: () => setOutputLines([]),
        openApp,
        listCommands: () => getCommandList(),
      };

      try {
        await commandDef.handler(args, ctx);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.writeLine(`Error: ${message}`);
      }
    },
    [aliases, history, openApp, runWorker, writeLine],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const input = currentInput.trim();
      if (!input) return;
      const nextHistory = [...history, input];
      setOutputLines((prev) => [...prev, `$ ${input}`]);
      setHistory(nextHistory);
      setCurrentInput('');
      void executeCommand(input, nextHistory);
    },
    [currentInput, executeCommand, history],
  );

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [outputLines]);

  useEffect(() => {
    if (tab?.active) {
      inputRef.current?.focus();
    }
  }, [tab?.active]);

  return (
    <div className="flex h-full w-full flex-col bg-black text-white">
      <div
        className="flex-1 overflow-y-auto p-2 font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
        role="presentation"
      >
        {outputLines.map((line, idx) => (
          <div key={`${line}-${idx}`} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
        <div ref={scrollAnchorRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-800 bg-black px-2 py-2 font-mono"
      >
        <span className="text-emerald-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(event) => setCurrentInput(event.target.value)}
          className="flex-1 bg-black text-white outline-none"
          autoFocus
          aria-label="Terminal input"
        />
      </form>
    </div>
  );
};

export default TerminalApp;
