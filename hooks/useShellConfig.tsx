'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import usePersistentState from './usePersistentState';
import { useSettings } from './useSettings';
import { logModeEngagement } from '../utils/analytics';

const STORAGE_KEY = 'shell:red-team-mode';
const MAX_EVIDENCE_ITEMS = 100;
const MAX_WARNINGS = 10;

export interface EvidenceEntry {
  id: string;
  source: string;
  content: string;
  timestamp: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvidencePayload {
  source: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  id?: string;
  timestamp?: number;
}

export type WarningSeverity = 'info' | 'warning' | 'critical';

export interface ModeWarning {
  id: string;
  message: string;
  timestamp: number;
  severity: WarningSeverity;
  context?: Record<string, unknown>;
}

export interface WarningPayload {
  message: string;
  severity?: WarningSeverity;
  context?: Record<string, unknown>;
  id?: string;
  timestamp?: number;
}

interface ShellConfigContextValue {
  redTeamMode: boolean;
  evidenceCaptureEnabled: boolean;
  setRedTeamMode: (enabled: boolean) => void;
  toggleRedTeamMode: () => void;
  captureEvidence: (payload: EvidencePayload) => EvidenceEntry | null;
  evidence: EvidenceEntry[];
  warnings: ModeWarning[];
  pushWarning: (payload: WarningPayload) => ModeWarning;
  dismissWarning: (id: string) => void;
}

const ShellConfigContext = createContext<ShellConfigContextValue | undefined>(
  undefined,
);

export const ShellConfigProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const { theme, setTheme } = useSettings();
  const [redTeamMode, setRedTeamModeState] = usePersistentState<boolean>(
    STORAGE_KEY,
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [warnings, setWarnings] = useState<ModeWarning[]>([]);
  const previousThemeRef = useRef<string>('default');
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (redTeamMode) {
      if (theme !== 'redteam') {
        if (theme && theme !== 'redteam') {
          previousThemeRef.current = theme;
        }
        setTheme('redteam');
      }
    } else if (theme === 'redteam') {
      const fallback =
        previousThemeRef.current && previousThemeRef.current !== 'redteam'
          ? previousThemeRef.current
          : 'default';
      setTheme(fallback);
    }
  }, [redTeamMode, setTheme, theme]);

  useEffect(() => {
    if (hasLoggedRef.current) {
      logModeEngagement('red-team', redTeamMode ? 'enable' : 'disable');
    } else {
      hasLoggedRef.current = true;
    }
    if (!redTeamMode) {
      setEvidence([]);
      setWarnings([]);
    }
  }, [redTeamMode]);

  const captureEvidence = useCallback(
    (payload: EvidencePayload): EvidenceEntry | null => {
      if (!redTeamMode) return null;
      const entry: EvidenceEntry = {
        id:
          payload.id ??
          `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: payload.timestamp ?? Date.now(),
        source: payload.source,
        content: payload.content,
        tags: payload.tags ?? [],
        metadata: payload.metadata,
      };
      setEvidence((prev) => [entry, ...prev].slice(0, MAX_EVIDENCE_ITEMS));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('shell:evidence-captured', { detail: entry }),
        );
      }
      return entry;
    },
    [redTeamMode],
  );

  const pushWarning = useCallback(
    (payload: WarningPayload): ModeWarning => {
      const warning: ModeWarning = {
        id:
          payload.id ??
          `warning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: payload.timestamp ?? Date.now(),
        message: payload.message,
        severity: payload.severity ?? 'warning',
        context: payload.context,
      };
      setWarnings((prev) => [warning, ...prev].slice(0, MAX_WARNINGS));
      return warning;
    },
    [],
  );

  const dismissWarning = useCallback((id: string) => {
    setWarnings((prev) => prev.filter((warning) => warning.id !== id));
  }, []);

  const setRedTeamMode = useCallback(
    (enabled: boolean) => {
      setRedTeamModeState(enabled);
    },
    [setRedTeamModeState],
  );

  const toggleRedTeamMode = useCallback(() => {
    setRedTeamModeState((prev) => !prev);
  }, [setRedTeamModeState]);

  const value = useMemo(
    () => ({
      redTeamMode,
      evidenceCaptureEnabled: redTeamMode,
      setRedTeamMode,
      toggleRedTeamMode,
      captureEvidence,
      evidence,
      warnings,
      pushWarning,
      dismissWarning,
    }),
    [
      captureEvidence,
      dismissWarning,
      evidence,
      pushWarning,
      redTeamMode,
      setRedTeamMode,
      toggleRedTeamMode,
      warnings,
    ],
  );

  return (
    <ShellConfigContext.Provider value={value}>
      {children}
    </ShellConfigContext.Provider>
  );
};

export const useOptionalShellConfig = () => useContext(ShellConfigContext);

export const useShellConfig = (): ShellConfigContextValue => {
  const context = useOptionalShellConfig();
  if (!context) {
    throw new Error('useShellConfig must be used within a ShellConfigProvider');
  }
  return context;
};
