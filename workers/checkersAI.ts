/// <reference lib="webworker" />

import { Move } from '../components/apps/checkers/engine';
import { chooseMove, hydrateGameState, SerializedGameState } from '../games/checkers/logic';

type ChooseMoveRequest = {
  type: 'chooseMove';
  state: SerializedGameState;
  depth: number;
  requestId?: number;
};

type ChooseMoveResponse = {
  type: 'chooseMoveResult';
  move: Move | null;
  requestId?: number;
};

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<ChooseMoveRequest>) => {
  const data = event.data;
  if (!data || data.type !== 'chooseMove') return;
  const state = hydrateGameState(data.state);
  const move = chooseMove(state, data.depth);
  const response: ChooseMoveResponse = {
    type: 'chooseMoveResult',
    move,
    requestId: data.requestId,
  };
  workerScope.postMessage(response);
};

export {};
