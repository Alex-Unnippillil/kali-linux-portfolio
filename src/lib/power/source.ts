import { PowerSettings, PowerProfile } from './schema';

export type PowerSource = keyof PowerSettings; // 'ac' | 'battery'

let simulatedSource: PowerSource = 'ac';

export function setSimulatedSource(source: PowerSource) {
  simulatedSource = source;
}

export function getSimulatedSource(): PowerSource {
  return simulatedSource;
}

export function getActiveProfile(settings: PowerSettings): PowerProfile {
  return settings[simulatedSource];
}
