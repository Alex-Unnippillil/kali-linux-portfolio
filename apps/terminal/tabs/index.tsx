'use client';

import React, {
  createContext,
  createRef,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
} from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal, { TerminalHandle, TerminalProps } from '..';

interface SessionMeta {
  id: string;
  title: string;
}

interface TerminalTabsState {
  sessions: SessionMeta[];
  activeId: string | null;
  counter: number;
}

type Action =
  | { type: 'ADD_SESSION'; session: SessionMeta }
  | { type: 'REMOVE_SESSION'; id: string }
  | { type: 'SET_ACTIVE'; id: string }
  | { type: 'SYNC_TABS'; tabs: Pick<TabDefinition, 'id' | 'title'>[] };

const TerminalSessionsContext = createContext<{
  sessions: SessionMeta[];
  activeSessionId: string | null;
}>({
  sessions: [],
  activeSessionId: null,
});

export const useTerminalSessions = () => useContext(TerminalSessionsContext);

function reducer(state: TerminalTabsState, action: Action): TerminalTabsState {
  switch (action.type) {
    case 'ADD_SESSION':
      return {
        sessions: [...state.sessions, action.session],
        activeId: action.session.id,
        counter: state.counter + 1,
      };
    case 'REMOVE_SESSION': {
      const sessions = state.sessions.filter((s) => s.id !== action.id);
      const activeId = state.activeId === action.id ? null : state.activeId;
      return { ...state, sessions, activeId };
    }
    case 'SET_ACTIVE':
      if (state.activeId === action.id) return state;
      return { ...state, activeId: action.id };
    case 'SYNC_TABS': {
      const tabMap = new Map(action.tabs.map((tab) => [tab.id, tab] as const));
      const sessionMap = new Map(state.sessions.map((session) => [session.id, session] as const));
      const nextSessions: SessionMeta[] = [];
      for (const [id, tab] of tabMap) {
        const existing = sessionMap.get(id);
        if (!existing) continue;
        if (existing.title !== tab.title) {
          nextSessions.push({ ...existing, title: tab.title });
        } else {
          nextSessions.push(existing);
        }
      }
      if (
        nextSessions.length === state.sessions.length &&
        nextSessions.every((session, index) => session === state.sessions[index])
      ) {
        return state;
      }
      return { ...state, sessions: nextSessions };
    }
    default:
      return state;
  }
}

const TerminalTabs: React.FC<TerminalProps> = ({ openApp }) => {
  const [state, dispatch] = useReducer(reducer, {
    sessions: [],
    activeId: null,
    counter: 1,
  });

  const createTab = useCallback((): TabDefinition => {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `Session ${state.counter}`;
    const ref = createRef<TerminalHandle>();

    dispatch({ type: 'ADD_SESSION', session: { id, title } });

    const focusSession = () => {
      if (typeof window === 'undefined') return;
      window.setTimeout(() => {
        ref.current?.focus();
      }, 0);
    };

    return {
      id,
      title,
      content: <Terminal key={id} ref={ref} openApp={openApp} />,
      onActivate: () => {
        dispatch({ type: 'SET_ACTIVE', id });
        focusSession();
      },
      onDeactivate: () => {
        ref.current?.blur();
      },
      onClose: () => {
        dispatch({ type: 'REMOVE_SESSION', id });
      },
    };
  }, [openApp, state.counter]);

  const [initialTab] = useState<TabDefinition>(() => createTab());

  const contextValue = useMemo(
    () => ({
      sessions: state.sessions,
      activeSessionId: state.activeId,
    }),
    [state.sessions, state.activeId],
  );

  return (
    <TerminalSessionsContext.Provider value={contextValue}>
      <TabbedWindow
        className="h-full w-full"
        initialTabs={[initialTab]}
        onNewTab={createTab}
        onTabsChange={(tabs) =>
          dispatch({
            type: 'SYNC_TABS',
            tabs: tabs.map((tab) => ({ id: tab.id, title: tab.title })),
          })
        }
      />
    </TerminalSessionsContext.Provider>
  );
};

export default TerminalTabs;
