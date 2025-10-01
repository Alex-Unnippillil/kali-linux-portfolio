"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadAppRegistry } from '../lib/appRegistry';
import {
  GLOBAL_APP_ID,
  GLOBAL_APP_LABEL,
  PerformanceBudget,
  PerformanceBudgetMap,
  OverrideLogEntry,
  getDefaultBudget,
} from '../utils/performanceBudgets';
import { performanceBudgetManager } from '../utils/performanceBudgetManager';

interface PerformanceBudgetContextValue {
  budgets: PerformanceBudgetMap;
  metadata: Record<string, { title: string; path?: string; icon?: string }>;
  defaultBudget: PerformanceBudget;
  getBudget: (appId: string) => PerformanceBudget;
  setBudget: (appId: string, budget: PerformanceBudget) => void;
  resetBudget: (appId: string) => void;
  overrides: OverrideLogEntry[];
  clearOverrides: () => void;
}

const PerformanceBudgetContext = createContext<PerformanceBudgetContextValue | undefined>(
  undefined,
);

interface ProviderProps {
  children: ReactNode;
}

export function PerformanceBudgetProvider({ children }: ProviderProps) {
  const [budgets, setBudgets] = useState<PerformanceBudgetMap>(() =>
    performanceBudgetManager.getBudgets(),
  );
  const [overrides, setOverrides] = useState<OverrideLogEntry[]>(() =>
    performanceBudgetManager.getOverrides(),
  );
  const [metadata, setMetadata] = useState<
    Record<string, { title: string; path?: string; icon?: string }>
  >(() => performanceBudgetManager.getMetadata());

  const loadingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = performanceBudgetManager.subscribe(() => {
      setBudgets(performanceBudgetManager.getBudgets());
      setOverrides(performanceBudgetManager.getOverrides());
      setMetadata(performanceBudgetManager.getMetadata());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    loadAppRegistry()
      .then(({ apps, metadata: meta }) => {
        const merged: Record<string, { title: string; path?: string; icon?: string }> = {
          [GLOBAL_APP_ID]: { title: GLOBAL_APP_LABEL },
        };
        apps.forEach((app) => {
          merged[app.id] = { title: app.title, icon: app.icon };
        });
        Object.entries(meta).forEach(([id, value]) => {
          merged[id] = { title: value.title, icon: value.icon, path: value.path };
        });
        performanceBudgetManager.setMetadata(merged);
        setMetadata(performanceBudgetManager.getMetadata());
      })
      .catch((err) => {
        console.error('Failed to load app registry for performance budgets', err);
      });
  }, []);

  const value = useMemo<PerformanceBudgetContextValue>(() => {
    const getBudget = (appId: string) => performanceBudgetManager.getEffectiveBudget(appId);
    const setBudget = (appId: string, budget: PerformanceBudget) =>
      performanceBudgetManager.updateBudget(appId, budget);
    const resetBudget = (appId: string) => performanceBudgetManager.removeBudget(appId);
    const clearOverrides = () => performanceBudgetManager.clearOverrides();

    return {
      budgets,
      metadata,
      defaultBudget: getDefaultBudget(),
      getBudget,
      setBudget,
      resetBudget,
      overrides,
      clearOverrides,
    };
  }, [budgets, metadata, overrides]);

  return (
    <PerformanceBudgetContext.Provider value={value}>
      {children}
    </PerformanceBudgetContext.Provider>
  );
}

export function usePerformanceBudgets() {
  const ctx = useContext(PerformanceBudgetContext);
  if (!ctx) {
    throw new Error('usePerformanceBudgets must be used within PerformanceBudgetProvider');
  }
  return ctx;
}

