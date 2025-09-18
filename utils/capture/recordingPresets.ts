export type RecordingPresetId = 'balanced' | 'quality' | 'small-file';

export interface RecordingPreset {
  id: RecordingPresetId;
  label: string;
  description: string;
  frameRate: number;
  width: number;
  height: number;
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
  estimatedSizePerMinute: number;
}

const BITS_PER_BYTE = 8;
const BYTES_PER_MEGABYTE = 1024 * 1024;
const SECONDS_PER_MINUTE = 60;

function estimateSizePerMinute(videoBitsPerSecond: number, audioBitsPerSecond: number) {
  const totalBitsPerSecond = videoBitsPerSecond + audioBitsPerSecond;
  const totalBytesPerMinute = (totalBitsPerSecond / BITS_PER_BYTE) * SECONDS_PER_MINUTE;
  return totalBytesPerMinute / BYTES_PER_MEGABYTE;
}

export const RECORDING_PRESETS: RecordingPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: '1080p at 30 fps with tuned bitrates for everyday walkthroughs.',
    frameRate: 30,
    width: 1920,
    height: 1080,
    videoBitsPerSecond: 6_000_000,
    audioBitsPerSecond: 160_000,
    estimatedSizePerMinute: estimateSizePerMinute(6_000_000, 160_000),
  },
  {
    id: 'quality',
    label: 'Quality',
    description: '1440p at 60 fps prioritizing clarity for demos or tutorials.',
    frameRate: 60,
    width: 2560,
    height: 1440,
    videoBitsPerSecond: 12_000_000,
    audioBitsPerSecond: 192_000,
    estimatedSizePerMinute: estimateSizePerMinute(12_000_000, 192_000),
  },
  {
    id: 'small-file',
    label: 'Small File',
    description: '720p at 24 fps keeping file sizes minimal for quick shares.',
    frameRate: 24,
    width: 1280,
    height: 720,
    videoBitsPerSecond: 3_500_000,
    audioBitsPerSecond: 96_000,
    estimatedSizePerMinute: estimateSizePerMinute(3_500_000, 96_000),
  },
];

export const DEFAULT_RECORDING_PRESET = RECORDING_PRESETS[0];

export function getRecordingPreset(id: RecordingPresetId): RecordingPreset {
  const preset = RECORDING_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) {
    return DEFAULT_RECORDING_PRESET;
  }
  return preset;
}

export function formatEstimatedSize(sizeInMegabytes: number) {
  if (!Number.isFinite(sizeInMegabytes)) return '—';
  if (sizeInMegabytes >= 100) {
    return `≈${Math.round(sizeInMegabytes)} MB/min`;
  }
  return `≈${sizeInMegabytes.toFixed(1)} MB/min`;
}
