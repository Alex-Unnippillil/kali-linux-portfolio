import { useCallback, useMemo, useState } from 'react';
import usePersistentState from './usePersistentState';

export type WindowLayoutMode = 'tile' | 'float';

export interface WindowRuleTitleMatcher {
  pattern: string;
  flags?: string;
}

export interface WindowRuleMatcher {
  appId?: string;
  title?: WindowRuleTitleMatcher;
  monitorId?: string;
}

export interface WindowRuleAction {
  layout?: WindowLayoutMode;
  alwaysOnTop?: boolean;
  opacity?: number | null;
}

export interface WindowRule {
  id: string;
  name: string;
  enabled: boolean;
  match: WindowRuleMatcher;
  actions: WindowRuleAction;
}

export interface WindowRuleResult extends WindowRuleAction {
  matchedRuleIds: string[];
}

export interface WindowDescriptor {
  appId: string;
  title: string;
  monitorId?: string;
}

export interface MonitorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorSnapshot {
  id: string;
  name?: string;
  primary?: boolean;
  bounds?: MonitorBounds;
}

export type NewWindowRule = Partial<Omit<WindowRule, 'id'>> & {
  match?: WindowRuleMatcher;
  actions?: WindowRuleAction;
};

const STORAGE_KEY = 'window-rules';

const DEFAULT_RESULT: WindowRuleResult = {
  matchedRuleIds: [],
};

const clampOpacity = (value: number | null | undefined) => {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value)) return undefined;
  return Math.min(1, Math.max(0, value));
};

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : undefined;

const normalizeTitleMatcher = (
  matcher?: WindowRuleTitleMatcher,
): WindowRuleTitleMatcher | undefined => {
  if (!matcher) return undefined;
  const pattern = normalizeString(matcher.pattern) ?? '';
  const flags = normalizeString(matcher.flags);
  if (!pattern) return undefined;
  return { pattern, flags };
};

const normalizeMatcher = (matcher: WindowRuleMatcher = {}): WindowRuleMatcher => {
  const normalized: WindowRuleMatcher = {};
  const appId = normalizeString(matcher.appId);
  if (appId) normalized.appId = appId;
  const monitorId = normalizeString(matcher.monitorId);
  if (monitorId) normalized.monitorId = monitorId;
  const title = normalizeTitleMatcher(matcher.title);
  if (title) normalized.title = title;
  return normalized;
};

const normalizeActions = (actions: WindowRuleAction = {}): WindowRuleAction => {
  const normalized: WindowRuleAction = {};
  if (actions.layout === 'tile' || actions.layout === 'float') {
    normalized.layout = actions.layout;
  }
  if (typeof actions.alwaysOnTop === 'boolean') {
    normalized.alwaysOnTop = actions.alwaysOnTop;
  }
  const opacity = clampOpacity(actions.opacity);
  if (typeof opacity === 'number') {
    normalized.opacity = opacity;
  }
  return normalized;
};

const normalizeRule = (rule: WindowRule): WindowRule => ({
  id: rule.id,
  name: normalizeString(rule.name) || 'Untitled rule',
  enabled: typeof rule.enabled === 'boolean' ? rule.enabled : true,
  match: normalizeMatcher(rule.match),
  actions: normalizeActions(rule.actions),
});

const isRule = (value: unknown): value is WindowRule => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as WindowRule;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.enabled === 'boolean' &&
    candidate.match !== undefined &&
    candidate.actions !== undefined
  );
};

const isRuleArray = (value: unknown): value is WindowRule[] =>
  Array.isArray(value) && value.every(isRule);

const generateRuleId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rule-${Math.random().toString(36).slice(2, 11)}`;
};

const normalizeMonitor = (monitor: MonitorSnapshot): MonitorSnapshot => {
  const id = normalizeString(monitor.id) || generateRuleId();
  const name = normalizeString(monitor.name);
  const bounds = monitor.bounds;
  const normalizedBounds =
    bounds &&
    typeof bounds.x === 'number' &&
    typeof bounds.y === 'number' &&
    typeof bounds.width === 'number' &&
    typeof bounds.height === 'number'
      ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      : undefined;
  return {
    id,
    name: name || undefined,
    primary: monitor.primary ?? undefined,
    bounds: normalizedBounds,
  };
};

const defaultMonitors = (): MonitorSnapshot[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const width = window.innerWidth || window.screen?.width || 0;
  const height = window.innerHeight || window.screen?.height || 0;
  return [
    {
      id: 'primary',
      name: 'Primary Display',
      primary: true,
      bounds: { x: 0, y: 0, width, height },
    },
  ];
};

export const readCurrentMonitors = defaultMonitors;

const compileTitle = (matcher: WindowRuleTitleMatcher | undefined) => {
  if (!matcher) return null;
  try {
    return new RegExp(matcher.pattern, matcher.flags);
  } catch {
    return null;
  }
};

const matchesRule = (rule: WindowRule, descriptor: WindowDescriptor) => {
  if (!rule.enabled) return false;
  const { match } = rule;
  if (match.appId && match.appId !== descriptor.appId) return false;
  if (match.monitorId && match.monitorId !== descriptor.monitorId) return false;
  if (match.title) {
    const regex = compileTitle(match.title);
    if (!regex) return false;
    if (!regex.test(descriptor.title)) return false;
  }
  return true;
};

export default function useWindowRules() {
  const [storedRules, setStoredRules] = usePersistentState<WindowRule[]>(
    STORAGE_KEY,
    [],
    isRuleArray,
  );

  const rules = useMemo(
    () => storedRules.map((rule) => normalizeRule(rule)),
    [storedRules],
  );

  const [monitors, setMonitorsState] = useState<MonitorSnapshot[]>(defaultMonitors);

  const setMonitors = useCallback((next: MonitorSnapshot[]) => {
    setMonitorsState(next.map((monitor) => normalizeMonitor(monitor)));
  }, []);

  const addRule = useCallback(
    (draft: NewWindowRule = {}) => {
      const rule: WindowRule = normalizeRule({
        id: generateRuleId(),
        name: draft.name ?? 'New rule',
        enabled: draft.enabled ?? true,
        match: normalizeMatcher(draft.match),
        actions: normalizeActions(draft.actions),
      });
      setStoredRules((prev) => [...prev, rule]);
      return rule.id;
    },
    [setStoredRules],
  );

  const updateRule = useCallback(
    (
      id: string,
      updates:
        | NewWindowRule
        | ((rule: WindowRule) => NewWindowRule | WindowRule | null | undefined),
    ) => {
      setStoredRules((prev) =>
        prev.map((rule) => {
          if (rule.id !== id) return rule;
          const patch = typeof updates === 'function' ? updates(rule) : updates;
          if (!patch) return rule;
          const next: WindowRule = normalizeRule({
            id: rule.id,
            name: patch.name ?? rule.name,
            enabled: patch.enabled ?? rule.enabled,
            match: normalizeMatcher({ ...rule.match, ...patch.match }),
            actions: normalizeActions({ ...rule.actions, ...patch.actions }),
          });
          return next;
        }),
      );
    },
    [setStoredRules],
  );

  const removeRule = useCallback(
    (id: string) => {
      setStoredRules((prev) => prev.filter((rule) => rule.id !== id));
    },
    [setStoredRules],
  );

  const moveRule = useCallback(
    (id: string, direction: -1 | 1) => {
      setStoredRules((prev) => {
        const index = prev.findIndex((rule) => rule.id === id);
        if (index === -1) return prev;
        const target = index + direction;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        const [item] = next.splice(index, 1);
        next.splice(target, 0, item);
        return next;
      });
    },
    [setStoredRules],
  );

  const evaluateWindowRules = useCallback(
    (descriptor: WindowDescriptor): WindowRuleResult => {
      const result: WindowRuleResult = { ...DEFAULT_RESULT, matchedRuleIds: [] };
      rules.forEach((rule) => {
        if (!matchesRule(rule, descriptor)) return;
        result.matchedRuleIds.push(rule.id);
        if (rule.actions.layout) {
          result.layout = rule.actions.layout;
        }
        if (typeof rule.actions.alwaysOnTop === 'boolean') {
          result.alwaysOnTop = rule.actions.alwaysOnTop;
        }
        if (typeof rule.actions.opacity === 'number') {
          result.opacity = rule.actions.opacity;
        }
      });
      return result;
    },
    [rules],
  );

  return {
    rules,
    monitors,
    setMonitors,
    addRule,
    updateRule,
    removeRule,
    moveRule,
    evaluateWindowRules,
  } as const;
}
