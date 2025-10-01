export const INITIAL_FILTER_STATE = Object.freeze({
  statuses: Object.freeze({
    success: true,
    fail: true,
  }),
  maxLatency: null,
});

export const createInitialFilterState = () => ({
  statuses: { ...INITIAL_FILTER_STATE.statuses },
  maxLatency: INITIAL_FILTER_STATE.maxLatency,
});

export const clampLatency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  return Math.max(0, Number(value));
};

export function taskFilterReducer(state, action) {
  switch (action.type) {
    case 'toggle-status': {
      const { status, enabled } = action;
      if (!(status in state.statuses)) {
        return state;
      }
      return {
        ...state,
        statuses: {
          ...state.statuses,
          [status]: enabled,
        },
      };
    }
    case 'set-max-latency': {
      return {
        ...state,
        maxLatency: clampLatency(action.maxLatency),
      };
    }
    case 'reset':
      return createInitialFilterState();
    default:
      return state;
  }
}

export const applyTaskFilters = (data, filters) => {
  const enabledStatuses = Object.entries(filters.statuses)
    .filter(([, isEnabled]) => isEnabled)
    .map(([status]) => status);
  const limit = filters.maxLatency;
  return data.filter((item) => {
    if (enabledStatuses.length > 0 && !enabledStatuses.includes(item.status)) {
      return false;
    }
    if (typeof limit === 'number' && limit !== null && item.latency > limit) {
      return false;
    }
    return true;
  });
};

export const calculateFilterMetrics = (data) => {
  if (data.length === 0) {
    return {
      total: 0,
      success: 0,
      fail: 0,
      averageLatency: 0,
      minLatency: null,
      maxLatency: null,
    };
  }

  let successCount = 0;
  let failCount = 0;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  data.forEach((item) => {
    if (item.status === 'success') successCount += 1;
    if (item.status === 'fail') failCount += 1;
    sum += item.latency;
    min = Math.min(min, item.latency);
    max = Math.max(max, item.latency);
  });

  return {
    total: data.length,
    success: successCount,
    fail: failCount,
    averageLatency: sum / data.length,
    minLatency: min,
    maxLatency: max,
  };
};

export const summarizeFilteredData = (data, metrics) => {
  const snapshot = metrics ?? calculateFilterMetrics(data);
  if (snapshot.total === 0) {
    return 'No task runs match the current filters.';
  }
  const averageLatency = Math.round(snapshot.averageLatency);
  return `Showing ${snapshot.total} runs. Success: ${snapshot.success}. Failure: ${snapshot.fail}. Average latency: ${averageLatency} ms.`;
};
