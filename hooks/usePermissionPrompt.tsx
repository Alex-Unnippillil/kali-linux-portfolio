import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type {
  PermissionPromptReason,
  PermissionType,
  PermissionDecision,
  PermissionPreference,
} from '../types/permissions';
import {
  getPermissionPreference,
  recordPermissionDecision,
  shouldPromptPermission,
} from '../utils/permissionPreferences';

type AsyncMaybe = void | Promise<void>;

export interface PermissionPromptContent {
  title: string;
  summary: string;
  reasons: PermissionPromptReason[];
  preview?: ReactNode;
  confirmLabel?: string;
  declineLabel?: string;
}

export interface PermissionPromptConfig extends PermissionPromptContent {
  permission: PermissionType;
  onAllow?: () => AsyncMaybe;
  onDeny?: () => AsyncMaybe;
}

export interface PermissionRequestResult {
  status: 'prompted' | 'pending' | 'blocked' | 'granted' | 'denied';
  preference: PermissionPreference | null;
}

const runMaybe = (fn?: () => AsyncMaybe) => {
  if (!fn) return;
  try {
    void fn();
  } catch {
    // swallow handler errors to avoid breaking UX
  }
};

const runMaybeAsync = async (fn?: () => AsyncMaybe) => {
  if (!fn) return;
  try {
    await fn();
  } catch {
    // ignore handler errors
  }
};

export const usePermissionPrompt = () => {
  const [prompt, setPrompt] = useState<PermissionPromptConfig | null>(null);
  const promptRef = useRef<PermissionPromptConfig | null>(null);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  const requestPermission = useCallback(
    (config: PermissionPromptConfig): PermissionRequestResult => {
      if (promptRef.current) {
        return { status: 'pending', preference: null };
      }

      const preference = getPermissionPreference(config.permission);

      if (preference?.remember) {
        if (preference.decision === 'granted') {
          runMaybe(config.onAllow);
          return { status: 'granted', preference };
        }
        runMaybe(config.onDeny);
        return { status: 'denied', preference };
      }

      if (!shouldPromptPermission(config.permission)) {
        return { status: 'blocked', preference: preference ?? null };
      }

      setPrompt(config);
      return { status: 'prompted', preference: preference ?? null };
    },
    [],
  );

  const resolvePermission = useCallback(
    (decision: PermissionDecision, remember: boolean) => {
      const active = promptRef.current;
      if (!active) return;
      setPrompt(null);
      promptRef.current = null;
      recordPermissionDecision(active.permission, decision, remember);
      const action = decision === 'granted' ? active.onAllow : active.onDeny;
      void runMaybeAsync(action);
    },
    [],
  );

  return { prompt, requestPermission, resolvePermission } as const;
};

export type { PermissionPromptReason };
