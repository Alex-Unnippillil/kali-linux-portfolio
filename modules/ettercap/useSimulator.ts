'use client';

import { useEffect, useMemo, useReducer } from 'react';

import { getScenarioById, SCENARIOS } from './fixtures';
import {
  createSimulatorState,
  reduceSimulatorState,
  ScenarioId,
  SimulatorAction,
} from './simulator';

export const useEttercapSimulator = (scenarioId: ScenarioId) => {
  const scenario = useMemo(() => getScenarioById(scenarioId), [scenarioId]);
  const [state, dispatch] = useReducer(
    (currentState, action: SimulatorAction) => reduceSimulatorState(currentState, scenario, action),
    scenario,
    createSimulatorState,
  );

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [scenario]);

  useEffect(() => {
    if (state.status !== 'running') return;
    const id = window.setInterval(() => {
      dispatch({ type: 'step' });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  return {
    scenario,
    scenarios: SCENARIOS,
    state,
    dispatch,
  };
};
