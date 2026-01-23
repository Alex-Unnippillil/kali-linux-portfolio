export type LogLevel = 'info' | 'warn' | 'error';

export type SimulatorEvent =
  | {
      time: number;
      type: 'log';
      level: LogLevel;
      message: string;
    }
  | {
      time: number;
      type: 'metric';
      key: string;
      value: number | string;
    }
  | {
      time: number;
      type: 'flow';
      from: string;
      to: string;
      label: string;
      tone?: 'normal' | 'warning' | 'alert';
    }
  | {
      time: number;
      type: 'arp';
      action: 'add' | 'update' | 'remove';
      entry: ArpEntry;
    }
  | {
      time: number;
      type: 'trace';
      message: string;
    };

export interface TimelineStep {
  title: string;
  description: string;
  start: number;
  end: number;
}

export interface ArpEntry {
  ip: string;
  mac: string;
  vendor: string;
  status?: 'stable' | 'poisoned' | 'flagged';
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  timeline: TimelineStep[];
  initialArpTable: ArpEntry[];
  initialMetrics: Record<string, number | string>;
  events: SimulatorEvent[];
}

export type ScenarioId = 'normal' | 'arp-poison' | 'dns-spoof' | 'filter-demo';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  time: number;
}

export interface FlowEntry {
  id: string;
  from: string;
  to: string;
  label: string;
  tone: 'normal' | 'warning' | 'alert';
  time: number;
}

export interface SimulatorState {
  scenarioId: ScenarioId;
  status: 'idle' | 'running' | 'paused' | 'complete';
  currentTime: number;
  eventCursor: number;
  logs: LogEntry[];
  metrics: Record<string, number | string>;
  flows: FlowEntry[];
  activeFlowId?: string;
  arpTable: ArpEntry[];
  traces: string[];
}

export type SimulatorAction =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'step' }
  | { type: 'reset' }
  | { type: 'clearLogs' };

export const getScenarioDuration = (scenario: Scenario) => {
  const eventTimes = scenario.events.map((event) => event.time);
  const timelineEnd = scenario.timeline.map((step) => step.end);
  return Math.max(0, ...eventTimes, ...timelineEnd);
};

export const createSimulatorState = (scenario: Scenario): SimulatorState => ({
  scenarioId: scenario.id,
  status: 'idle',
  currentTime: 0,
  eventCursor: 0,
  logs: [],
  metrics: { ...scenario.initialMetrics },
  flows: [],
  activeFlowId: undefined,
  arpTable: scenario.initialArpTable.map((entry) => ({ ...entry })),
  traces: [],
});

const applyEvent = (state: SimulatorState, event: SimulatorEvent): SimulatorState => {
  switch (event.type) {
    case 'log': {
      const logEntry: LogEntry = {
        id: `log-${event.time}-${state.logs.length}`,
        level: event.level,
        message: event.message,
        time: event.time,
      };
      return { ...state, logs: [...state.logs, logEntry] };
    }
    case 'metric': {
      return {
        ...state,
        metrics: {
          ...state.metrics,
          [event.key]: event.value,
        },
      };
    }
    case 'flow': {
      const flowEntry: FlowEntry = {
        id: `flow-${event.time}-${state.flows.length}`,
        from: event.from,
        to: event.to,
        label: event.label,
        tone: event.tone ?? 'normal',
        time: event.time,
      };
      return {
        ...state,
        flows: [...state.flows, flowEntry],
        activeFlowId: flowEntry.id,
      };
    }
    case 'arp': {
      const nextTable = [...state.arpTable];
      const index = nextTable.findIndex((entry) => entry.ip === event.entry.ip);
      if (event.action === 'remove') {
        if (index >= 0) nextTable.splice(index, 1);
      } else if (event.action === 'update') {
        if (index >= 0) {
          nextTable[index] = { ...nextTable[index], ...event.entry };
        } else {
          nextTable.push(event.entry);
        }
      } else if (event.action === 'add') {
        if (index === -1) nextTable.push(event.entry);
      }
      return { ...state, arpTable: nextTable };
    }
    case 'trace': {
      return { ...state, traces: [...state.traces, event.message] };
    }
    default:
      return state;
  }
};

const advanceState = (state: SimulatorState, scenario: Scenario, nextTime: number) => {
  const duration = getScenarioDuration(scenario);
  let nextState = { ...state, currentTime: nextTime };
  let cursor = nextState.eventCursor;
  while (cursor < scenario.events.length && scenario.events[cursor].time <= nextTime) {
    nextState = applyEvent(nextState, scenario.events[cursor]);
    cursor += 1;
  }
  nextState.eventCursor = cursor;
  if (nextTime >= duration) {
    nextState.status = 'complete';
  }
  return nextState;
};

export const reduceSimulatorState = (
  state: SimulatorState,
  scenario: Scenario,
  action: SimulatorAction,
): SimulatorState => {
  switch (action.type) {
    case 'start': {
      const reset = createSimulatorState(scenario);
      return { ...reset, status: 'running' };
    }
    case 'pause':
      return state.status === 'running' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'running' } : state;
    case 'step': {
      if (state.status === 'complete') return state;
      const nextTime = state.currentTime + 1;
      const advanced = advanceState(state, scenario, nextTime);
      if (state.status === 'idle') {
        advanced.status = advanced.status === 'complete' ? 'complete' : 'paused';
      }
      return advanced;
    }
    case 'reset':
      return createSimulatorState(scenario);
    case 'clearLogs':
      return { ...state, logs: [] };
    default:
      return state;
  }
};

export const getTimelineStatus = (
  scenario: Scenario,
  currentTime: number,
  status: SimulatorState['status'],
) =>
  scenario.timeline.map((step) => {
    if (status === 'idle') {
      return { ...step, status: 'pending' as const };
    }
    if (currentTime >= step.end) {
      return { ...step, status: 'done' as const };
    }
    if (currentTime >= step.start) {
      return { ...step, status: 'current' as const };
    }
    return { ...step, status: 'pending' as const };
  });
