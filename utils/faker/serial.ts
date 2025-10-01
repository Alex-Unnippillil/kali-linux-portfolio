import { createSeededRandom } from './random';

export type SerialDirection = 'rx' | 'tx';

export interface SerialFrame {
  id: number;
  timestamp: string;
  direction: SerialDirection;
  ascii: string;
  hex: string;
}

export interface SerialFrameOptions {
  seed?: string | number;
  count?: number;
  startTime?: number | Date;
}

export const DEFAULT_SERIAL_SEED = 'serial-terminal-demo';
const DEFAULT_SERIAL_START_TIME = Date.UTC(2025, 9, 1, 2, 52, 36);

const channels = ['TEMP', 'HUM', 'PRESS', 'VOLT', 'AMP'];
const events = ['ALERT', 'THROTTLE', 'CALIBRATION', 'STATUS'];
const messages = [
  'sensor ready',
  'buffer cleared',
  'calibration ok',
  'stream active',
  'watchdog ping',
];
const units: Record<string, string> = {
  TEMP: 'C',
  HUM: '%',
  PRESS: 'kPa',
  VOLT: 'V',
  AMP: 'mA',
};

const toHex = (value: string) =>
  Array.from(value)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase();

const formatValue = (channel: string, sample: number) => {
  switch (channel) {
    case 'TEMP':
      return (18 + sample * 10).toFixed(1);
    case 'HUM':
      return (30 + sample * 40).toFixed(0);
    case 'PRESS':
      return (90 + sample * 10).toFixed(1);
    case 'VOLT':
      return (11 + sample * 0.8).toFixed(2);
    case 'AMP':
      return (120 + sample * 30).toFixed(0);
    default:
      return sample.toFixed(2);
  }
};

export const formatSerialFrame = (frame: SerialFrame) => {
  const prefix = frame.direction === 'rx' ? 'RX' : 'TX';
  return `${frame.timestamp} ${prefix} ${frame.ascii} | ${frame.hex}`;
};

export const generateSerialFrames = (
  options: SerialFrameOptions = {}
): SerialFrame[] => {
  const {
    seed = DEFAULT_SERIAL_SEED,
    count = 12,
    startTime = DEFAULT_SERIAL_START_TIME,
  } = options;
  const rng = createSeededRandom(seed);
  const baseTime =
    typeof startTime === 'number' ? startTime : startTime.getTime();
  const frames: SerialFrame[] = [];
  let currentTime = baseTime;

  for (let i = 0; i < count; i += 1) {
    const direction: SerialDirection = rng.bool(0.45) ? 'tx' : 'rx';
    const channel = rng.pick(channels);
    const sample = rng.next();
    let ascii: string;
    if (direction === 'tx') {
      const commandId = 100 + Math.floor(sample * 400);
      ascii = `CMD ${channel} ${commandId}`;
    } else {
      const unit = units[channel];
      const value = formatValue(channel, sample);
      ascii = `DATA ${channel}=${value}${unit}`;
      if (rng.bool(0.3)) {
        const event = rng.pick(events);
        ascii += ` EVENT=${event}`;
      }
      if (rng.bool(0.25)) {
        const message = rng.pick(messages);
        ascii += ` NOTE=${message}`;
      }
    }
    const hex = toHex(ascii);
    const timestamp = new Date(currentTime).toISOString();
    frames.push({
      id: baseTime + i,
      timestamp,
      direction,
      ascii,
      hex,
    });
    currentTime += rng.int(250, 1250);
  }

  return frames;
};
