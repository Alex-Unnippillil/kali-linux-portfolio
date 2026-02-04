export type EngineRequestTracker = {
  next: () => number;
  isLatest: (requestId: number) => boolean;
  reset: () => void;
};

export const createEngineRequestTracker = (): EngineRequestTracker => {
  let latestId = 0;
  return {
    next: () => {
      latestId += 1;
      return latestId;
    },
    isLatest: (requestId: number) => requestId === latestId,
    reset: () => {
      latestId = 0;
    },
  };
};
