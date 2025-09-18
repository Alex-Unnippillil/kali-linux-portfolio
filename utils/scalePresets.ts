export type ScalePresetId = 'compact' | 'balanced' | 'comfortable';

export interface ScalePresetDefinition {
  id: ScalePresetId;
  label: string;
  description: string;
  fontScale: number;
  spacingScale: number;
}

export const SCALE_PRESETS: readonly ScalePresetDefinition[] = [
  {
    id: 'compact',
    label: 'Compact',
    description: 'Tighter typography and spacing for dense layouts.',
    fontScale: 0.9,
    spacingScale: 0.85,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Default scale tuned for the Kali desktop look.',
    fontScale: 1,
    spacingScale: 1,
  },
  {
    id: 'comfortable',
    label: 'Comfortable',
    description: 'Roomier spacing with slightly larger text.',
    fontScale: 1.1,
    spacingScale: 1.2,
  },
];

export const SCALE_PRESET_MAP: Record<ScalePresetId, ScalePresetDefinition> = SCALE_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<ScalePresetId, ScalePresetDefinition>,
);

export const DEFAULT_SCALE_PRESET: ScalePresetId = 'balanced';

export const isScalePresetId = (value: string | null | undefined): value is ScalePresetId =>
  !!value && value in SCALE_PRESET_MAP;
