"use client";

import { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';
import usePersistentState from './usePersistentState';

export type WelcomeTourStatus = 'not-started' | 'active' | 'skipped' | 'completed';

export interface WelcomeTourState {
  status: WelcomeTourStatus;
  currentStep: number;
}

interface WelcomeTourContextValue {
  state: WelcomeTourState;
  startTour: () => void;
  resumeTour: () => void;
  restartTour: () => void;
  skipTour: () => void;
  completeTour: () => void;
  setStep: (step: number | ((prev: number) => number)) => void;
  resetProgress: () => void;
}

const initialState: WelcomeTourState = {
  status: 'not-started',
  currentStep: 0,
};

const isWelcomeTourState = (value: unknown): value is WelcomeTourState => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WelcomeTourState>;
  return (
    typeof candidate.currentStep === 'number' &&
    candidate.currentStep >= 0 &&
    candidate.status !== undefined &&
    ['not-started', 'active', 'skipped', 'completed'].includes(candidate.status)
  );
};

const WelcomeTourContext = createContext<WelcomeTourContextValue | undefined>(undefined);

export function WelcomeTourProvider({ children }: { children: ReactNode }) {
  const [state, setState, resetState] = usePersistentState<WelcomeTourState>(
    'welcome-tour-progress',
    initialState,
    isWelcomeTourState,
  );

  const startTour = useCallback(() => {
    setState((prev) => {
      if (prev.status === 'active') return prev;
      return {
        status: 'active',
        currentStep: Math.max(0, prev.currentStep ?? 0),
      };
    });
  }, [setState]);

  const resumeTour = useCallback(() => {
    setState((prev) => ({
      status: 'active',
      currentStep: Math.max(0, prev.currentStep ?? 0),
    }));
  }, [setState]);

  const restartTour = useCallback(() => {
    setState({
      status: 'active',
      currentStep: 0,
    });
  }, [setState]);

  const skipTour = useCallback(() => {
    setState((prev) => ({
      status: 'skipped',
      currentStep: Math.max(0, prev.currentStep ?? 0),
    }));
  }, [setState]);

  const completeTour = useCallback(() => {
    setState((prev) => ({
      status: 'completed',
      currentStep: Math.max(0, prev.currentStep ?? 0),
    }));
  }, [setState]);

  const setStep = useCallback(
    (step: number | ((prev: number) => number)) => {
      setState((prev) => {
        const nextStep = typeof step === 'function' ? (step as (prev: number) => number)(prev.currentStep) : step;
        return {
          ...prev,
          currentStep: nextStep < 0 ? 0 : nextStep,
        };
      });
    },
    [setState],
  );

  const resetProgress = useCallback(() => {
    resetState();
  }, [resetState]);

  const value = useMemo<WelcomeTourContextValue>(
    () => ({
      state,
      startTour,
      resumeTour,
      restartTour,
      skipTour,
      completeTour,
      setStep,
      resetProgress,
    }),
    [state, startTour, resumeTour, restartTour, skipTour, completeTour, setStep, resetProgress],
  );

  return <WelcomeTourContext.Provider value={value}>{children}</WelcomeTourContext.Provider>;
}

export function useWelcomeTour() {
  const context = useContext(WelcomeTourContext);
  if (!context) {
    throw new Error('useWelcomeTour must be used within a WelcomeTourProvider');
  }
  return context;
}

export function useWelcomeTourState() {
  return useWelcomeTour().state;
}
