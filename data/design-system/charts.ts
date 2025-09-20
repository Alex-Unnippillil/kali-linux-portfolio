export type ChartTextureKey = 'cpu' | 'memory' | 'disk' | 'network';

export type ChartTextureType =
  | 'forward-diagonal'
  | 'dot-grid'
  | 'cross-hatch'
  | 'horizontal-band';

export interface ChartTextureToken {
  /**
   * Unique base id used when rendering the SVG pattern.
   */
  id: string;
  /**
   * Description that explains the semantic meaning behind the texture.
   */
  description: string;
  /**
   * Base size of the tile. When consumed by `<pattern />` this becomes both width and height.
   */
  size: number;
  /**
   * Background colour. Use alpha so the underlying theme colour still shines through.
   */
  background: string;
  /**
   * Foreground colour for lines and dots.
   */
  foreground: string;
  /**
   * Token specific type that determines how the renderer builds the pattern.
   */
  type: ChartTextureType;
  /**
   * Distance in pixels between repeated shapes (lines or dots).
   */
  spacing: number;
  /**
   * Stroke width for lines. Dot radius is derived from this for circular motifs.
   */
  strokeWidth: number;
  /**
   * Explicit radius for dotted textures.
   */
  radius?: number;
}

const SURFACE = 'var(--chart-texture-surface, rgba(148, 163, 184, 0.12))';
const INK = 'var(--chart-texture-ink, rgba(226, 232, 240, 0.65))';

export const CHART_TEXTURES: Record<ChartTextureKey, ChartTextureToken> = {
  cpu: {
    id: 'chart-texture-cpu',
    description: 'Forward-leaning diagonal stripes signalling active CPU slices.',
    size: 10,
    background: SURFACE,
    foreground: INK,
    type: 'forward-diagonal',
    spacing: 5,
    strokeWidth: 1.5,
  },
  memory: {
    id: 'chart-texture-memory',
    description: 'Evenly spaced circular markers visualising chunk-based memory allocations.',
    size: 12,
    background: SURFACE,
    foreground: INK,
    type: 'dot-grid',
    spacing: 6,
    strokeWidth: 1,
    radius: 1.4,
  },
  disk: {
    id: 'chart-texture-disk',
    description: 'Cross-hatched sweeps representing read/write passes across the disk platter.',
    size: 10,
    background: SURFACE,
    foreground: INK,
    type: 'cross-hatch',
    spacing: 5,
    strokeWidth: 1.2,
  },
  network: {
    id: 'chart-texture-network',
    description: 'Horizontal bursts capturing the cadence of network throughput.',
    size: 8,
    background: SURFACE,
    foreground: INK,
    type: 'horizontal-band',
    spacing: 3,
    strokeWidth: 1.6,
  },
};
