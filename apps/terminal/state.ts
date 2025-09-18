'use client';

import React from 'react';

import type { CommandContext } from './commands';

export type SplitDirection = 'horizontal' | 'vertical';

export interface TerminalSessionRuntime {
  id: string;
  title: string;
  commandRef: React.MutableRefObject<string>;
  contentRef: React.MutableRefObject<string>;
  filesRef: React.MutableRefObject<Record<string, string>>;
  aliasesRef: React.MutableRefObject<Record<string, string>>;
  historyRef: React.MutableRefObject<string[]>;
  registryRef: React.MutableRefObject<Record<string, any>>;
  contextRef: React.MutableRefObject<CommandContext & {
    splitPane?: (direction: SplitDirection) => void;
    detachPane?: () => void;
    renameSession?: (title: string) => void;
  }>;
  workerRef: React.MutableRefObject<Worker | null>;
  termRef: React.MutableRefObject<any | null>;
  fitRef: React.MutableRefObject<any | null>;
  searchRef: React.MutableRefObject<any | null>;
  dirRef: React.MutableRefObject<FileSystemDirectoryHandle | null>;
  overflowRef: React.MutableRefObject<{ top: boolean; bottom: boolean }>;
  runCommand?: (command: string) => Promise<void> | void;
  getContent?: () => string;
}

const sessions = new Map<string, TerminalSessionRuntime>();

let sessionCounter = 1;

const defaultFiles = {
  'README.md': 'Welcome to the web terminal.\nThis is a fake file used for demos.',
};

function createMutable<T>(value: T): React.MutableRefObject<T> {
  return { current: value };
}

function buildContext(): CommandContext & {
  splitPane?: (direction: SplitDirection) => void;
  detachPane?: () => void;
  renameSession?: (title: string) => void;
} {
  return {
    writeLine: () => {},
    files: {},
    history: [],
    aliases: {},
    setAlias: () => {},
    runWorker: async () => {},
  };
}

export function createSessionId() {
  return `terminal-session-${sessionCounter++}`;
}

export function createSession(sessionId = createSessionId()): TerminalSessionRuntime {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  const context = buildContext();
  const session: TerminalSessionRuntime = {
    id: sessionId,
    title: `Session ${sessionCounter - 1}`,
    commandRef: createMutable(''),
    contentRef: createMutable(''),
    filesRef: createMutable({ ...defaultFiles }),
    aliasesRef: createMutable({}),
    historyRef: createMutable([]),
    registryRef: createMutable({}),
    contextRef: createMutable(context),
    workerRef: createMutable<Worker | null>(null),
    termRef: createMutable<any | null>(null),
    fitRef: createMutable<any | null>(null),
    searchRef: createMutable<any | null>(null),
    dirRef: createMutable<FileSystemDirectoryHandle | null>(null),
    overflowRef: createMutable({ top: false, bottom: false }),
  };
  context.files = session.filesRef.current;
  context.history = session.historyRef.current;
  context.aliases = session.aliasesRef.current;
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string) {
  return sessions.get(sessionId);
}

export function ensureSession(sessionId: string) {
  return sessions.get(sessionId) ?? createSession(sessionId);
}

export function destroySession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;
  try {
    session.workerRef.current?.terminate();
  } catch (err) {
    console.error('Failed to terminate terminal worker', err);
  }
  try {
    session.termRef.current?.dispose?.();
  } catch (err) {
    console.error('Failed to dispose terminal', err);
  }
  sessions.delete(sessionId);
}

export function updateSessionTitle(sessionId: string, title: string) {
  const session = sessions.get(sessionId);
  if (session) {
    session.title = title;
  }
}

export function listSessions() {
  return Array.from(sessions.values());
}

export function resetSessions() {
  sessions.forEach((session) => {
    try {
      session.workerRef.current?.terminate();
    } catch {}
    try {
      session.termRef.current?.dispose?.();
    } catch {}
  });
  sessions.clear();
  sessionCounter = 1;
}

