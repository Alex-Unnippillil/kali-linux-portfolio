import {
  createInitialProcessState,
  processReducer,
  sortProcessList,
} from '../../../components/apps/resource_monitor';

describe('resource monitor process reducer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refresh recalculates metrics and cools terminated processes', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const base = createInitialProcessState();
    const running = {
      ...base.processes[0],
      cpu: 10,
      cpuBase: 20,
      cpuVariance: 0,
      mem: 100,
      memBase: 200,
      memVariance: 0,
    };
    const terminated = {
      ...base.processes[1],
      status: 'terminated' as const,
      mem: 50,
    };
    const state = {
      ...base,
      processes: [running, terminated],
    };

    const next = processReducer(state, { type: 'refresh' });

    expect(next.processes[0].cpu).toBeCloseTo(14.5, 1);
    expect(next.processes[0].mem).toBe(140);
    expect(next.processes[1].mem).toBe(Math.round(50 * 0.6));
    expect(next.processes[1].status).toBe('terminated');
  });

  it('records kill action and zeros process metrics', () => {
    const base = createInitialProcessState();
    const target = base.processes[0];
    const next = processReducer(base, { type: 'kill', payload: { pid: target.pid } });

    expect(next.processes[0].status).toBe('terminated');
    expect(next.processes[0].cpu).toBe(0);
    expect(next.processes[0].mem).toBe(0);
    expect(next.lastAction).toEqual({ type: 'kill', pid: target.pid });
  });

  it('clamps renice values and logs action', () => {
    const base = createInitialProcessState();
    const target = base.processes[0];
    const next = processReducer(base, {
      type: 'renice',
      payload: { pid: target.pid, nice: 50 },
    });

    expect(next.processes[0].nice).toBeLessThanOrEqual(19);
    expect(next.lastAction).toEqual({
      type: 'renice',
      pid: target.pid,
      nice: next.processes[0].nice,
    });
  });

  it('captures open-location action and lastOpenedPath', () => {
    const base = createInitialProcessState();
    const target = base.processes[0];
    const next = processReducer(base, {
      type: 'open-location',
      payload: { pid: target.pid },
    });

    expect(next.lastAction).toEqual({
      type: 'open-location',
      pid: target.pid,
      path: target.path,
    });
    expect(next.lastOpenedPath).toBe(target.path);
  });

  it('acknowledge clears the last action', () => {
    const base = createInitialProcessState();
    const withAction = processReducer(base, {
      type: 'open-location',
      payload: { pid: base.processes[0].pid },
    });
    const cleared = processReducer(withAction, { type: 'acknowledge' });

    expect(cleared.lastAction).toBeNull();
  });

  it('toggles sort direction when sorting by the same key', () => {
    const base = createInitialProcessState();
    const firstToggle = processReducer(base, { type: 'sort', payload: { key: 'cpu' } });
    expect(firstToggle.sortKey).toBe('cpu');
    expect(firstToggle.sortDirection).toBe('asc');
    const secondToggle = processReducer(firstToggle, { type: 'sort', payload: { key: 'cpu' } });
    expect(secondToggle.sortDirection).toBe('desc');
  });
});

describe('sortProcessList', () => {
  it('maintains launch order when values tie', () => {
    const processes = [
      { pid: 1, name: 'Alpha', cpu: 10, mem: 20, nice: 0, status: 'running', launchOrder: 0 },
      { pid: 2, name: 'Bravo', cpu: 10, mem: 30, nice: 0, status: 'running', launchOrder: 1 },
    ];

    const sorted = sortProcessList(processes, 'cpu', 'asc');
    expect(sorted.map((p) => p.pid)).toEqual([1, 2]);
  });

  it('sorts by requested field and direction', () => {
    const processes = [
      { pid: 3, name: 'Charlie', cpu: 30, mem: 500, nice: 0, status: 'running', launchOrder: 2 },
      { pid: 1, name: 'Alpha', cpu: 10, mem: 100, nice: 0, status: 'running', launchOrder: 0 },
      { pid: 2, name: 'Bravo', cpu: 20, mem: 200, nice: 0, status: 'running', launchOrder: 1 },
    ];

    const byName = sortProcessList(processes, 'name', 'asc');
    expect(byName.map((p) => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);

    const byCpuDesc = sortProcessList(processes, 'cpu', 'desc');
    expect(byCpuDesc.map((p) => p.pid)).toEqual([3, 2, 1]);
  });
});
