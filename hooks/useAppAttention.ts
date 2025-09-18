import { useCallback } from 'react';
import {
  TaskbarAttentionDetail,
  dispatchTaskbarAttention,
} from '../modules/taskbarAttention';

type DetailWithoutId = Omit<TaskbarAttentionDetail, 'id'>;

export const useAppAttention = (id: string | null | undefined) => {
  const send = useCallback(
    (detail: DetailWithoutId) => {
      if (!id) return;
      dispatchTaskbarAttention({ id, ...detail });
    },
    [id]
  );

  const setBadgeCount = useCallback(
    (badgeCount: number) => {
      send({ badgeCount });
    },
    [send]
  );

  const incrementBadgeCount = useCallback(
    (delta = 1) => {
      send({ delta });
    },
    [send]
  );

  const setPulse = useCallback(
    (pulse: boolean) => {
      send({ pulse });
    },
    [send]
  );

  const clearAttention = useCallback(() => {
    send({ clear: true });
  }, [send]);

  return {
    setBadgeCount,
    incrementBadgeCount,
    setPulse,
    clearAttention,
  };
};

export default useAppAttention;
