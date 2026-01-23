import { getScenarioById } from '../../../modules/ettercap/fixtures';
import { createSimulatorState, reduceSimulatorState } from '../../../modules/ettercap/simulator';

describe('Ettercap simulator engine', () => {
  it('plays back scenario events deterministically', () => {
    const scenario = getScenarioById('arp-poison');
    let state = createSimulatorState(scenario);

    state = reduceSimulatorState(state, scenario, { type: 'step' });
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].message).toMatch(/Targets locked/);

    state = reduceSimulatorState(state, scenario, { type: 'step' });
    const victimEntry = state.arpTable.find((entry) => entry.ip === '10.0.0.22');
    expect(victimEntry?.status).toBe('poisoned');
    expect(state.logs.some((log) => /victim now associates gateway/i.test(log.message))).toBe(true);

    state = reduceSimulatorState(state, scenario, { type: 'step' });
    const gatewayEntry = state.arpTable.find((entry) => entry.ip === '10.0.0.1');
    expect(gatewayEntry?.status).toBe('poisoned');
  });

  it('supports step and reset behavior', () => {
    const scenario = getScenarioById('normal');
    let state = createSimulatorState(scenario);

    state = reduceSimulatorState(state, scenario, { type: 'step' });
    expect(state.currentTime).toBe(1);
    expect(state.status).toBe('paused');

    state = reduceSimulatorState(state, scenario, { type: 'reset' });
    expect(state.currentTime).toBe(0);
    expect(state.logs).toHaveLength(0);
  });

  it('produces identical output for repeated runs', () => {
    const scenario = getScenarioById('dns-spoof');

    const runSimulation = () => {
      let state = createSimulatorState(scenario);
      for (let i = 0; i < 4; i += 1) {
        state = reduceSimulatorState(state, scenario, { type: 'step' });
      }
      return state;
    };

    const firstRun = runSimulation();
    const secondRun = runSimulation();

    expect(firstRun.logs).toEqual(secondRun.logs);
    expect(firstRun.traces).toEqual(secondRun.traces);
    expect(firstRun.metrics).toEqual(secondRun.metrics);
  });
});
