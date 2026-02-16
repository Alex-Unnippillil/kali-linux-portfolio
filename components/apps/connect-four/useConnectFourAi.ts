import { useCallback, useEffect, useRef } from 'react';
import { getMoveForDifficulty, type Board, type Difficulty, type Token, type TranspositionTable } from '../../../games/connect-four/solver';

type Request = {
  taskId: number;
  board: Board;
  player: Token;
  difficulty: Difficulty;
  quality: number;
};

type Result = { taskId: number; column: number; scores?: (number | null)[]; depthReached?: number };

const isResult = (payload: unknown): payload is Result => {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Result;
  return typeof value.taskId === 'number' && typeof value.column === 'number';
};

export default function useConnectFourAi() {
  const workerRef = useRef<Worker | null>(null);
  const tableRef = useRef<TranspositionTable>(new Map());

  const resetTable = useCallback(() => {
    tableRef.current = new Map();
  }, []);

  useEffect(() => {
    if (typeof Worker !== 'function') return;

    try {
      workerRef.current = new Worker(new URL('../connect-four.worker.js', import.meta.url));
    } catch {
      workerRef.current = null;
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const requestMove = useCallback(
    (request: Request): Promise<Result> => {
      const worker = workerRef.current;
      if (!worker) {
        const result = getMoveForDifficulty(request.board, request.player, request.difficulty, {
          table: tableRef.current,
          hardTimeMs: request.quality > 1 ? 750 : 350,
        });
        return Promise.resolve({ taskId: request.taskId, column: result.column, scores: result.scores, depthReached: result.depthReached });
      }

      return new Promise((resolve) => {
        const fallback = () => {
          const result = getMoveForDifficulty(request.board, request.player, request.difficulty, {
            table: tableRef.current,
            hardTimeMs: request.quality > 1 ? 750 : 350,
          });
          resolve({ taskId: request.taskId, column: result.column, scores: result.scores, depthReached: result.depthReached });
        };

        const onMessage = (event: MessageEvent) => {
          const payload = event.data;
          if (!payload || payload.taskId !== request.taskId) return;
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          if (!isResult(payload)) {
            fallback();
            return;
          }
          resolve(payload);
        };

        const onError = () => {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          workerRef.current?.terminate();
          workerRef.current = null;
          fallback();
        };

        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError, { once: true });
        worker.postMessage(request);
      });
    },
    [],
  );

  return { requestMove, resetTable };
}
