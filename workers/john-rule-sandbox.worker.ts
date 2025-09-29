import {
  RuleSimulationInput,
  SimulationProgress,
  simulateRuleSetAsync,
} from '../modules/john/rule-sandbox';

interface SimulationMessage {
  id: number;
  type: 'simulate';
  payload: RuleSimulationInput;
}

interface ProgressMessage {
  id: number;
  type: 'progress';
  payload: SimulationProgress;
}

interface ResultMessage {
  id: number;
  type: 'result';
  payload: Awaited<ReturnType<typeof simulateRuleSetAsync>>;
}

interface ErrorMessage {
  id: number;
  type: 'error';
  error: string;
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<SimulationMessage>) => {
  const { id, type, payload } = event.data;
  if (type !== 'simulate') return;

  try {
    const result = await simulateRuleSetAsync(payload, {
      chunkSize: 25,
      progress: (progress) => {
        const message: ProgressMessage = { id, type: 'progress', payload: progress };
        ctx.postMessage(message);
      },
    });
    const message: ResultMessage = { id, type: 'result', payload: result };
    ctx.postMessage(message);
  } catch (error) {
    const message: ErrorMessage = {
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    ctx.postMessage(message);
  }
};

export {}; // ensure module scope
