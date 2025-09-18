export interface ContrastCheckOptions {
  readonly minContrast?: number;
  readonly label?: string;
}

export interface ContrastFailure {
  readonly index: number;
  readonly color: string;
  readonly contrast: number;
  readonly required: number;
}

const HEX_COLOR_RE = /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/;

const normalizeHex = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Color value cannot be empty');
  }
  if (!HEX_COLOR_RE.test(trimmed)) {
    throw new Error(`Unsupported color format: ${input}`);
  }
  let hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  return `#${hex.toLowerCase()}`;
};

export const hexToRgb = (color: string): { r: number; g: number; b: number } => {
  const hex = normalizeHex(color).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
};

const srgbChannel = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (color: string): number => {
  const { r, g, b } = hexToRgb(color);
  const rLinear = srgbChannel(r);
  const gLinear = srgbChannel(g);
  const bLinear = srgbChannel(b);
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

export const contrastRatio = (colorA: string, colorB: string): number => {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
};

export const validateAnsiRamp = (
  ramp: readonly string[],
  background: string,
  minContrast = 4.5,
): ContrastFailure[] => {
  const required = minContrast;
  const normalizedBackground = normalizeHex(background);
  const backgroundLuminance = relativeLuminance(normalizedBackground);

  return ramp.reduce<ContrastFailure[]>((acc, color, index) => {
    const normalizedColor = normalizeHex(color);
    const colorLuminance = relativeLuminance(normalizedColor);
    const lighter = Math.max(colorLuminance, backgroundLuminance);
    const darker = Math.min(colorLuminance, backgroundLuminance);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    if (ratio < required) {
      acc.push({
        index,
        color: normalizedColor,
        contrast: ratio,
        required,
      });
    }

    return acc;
  }, []);
};

export const assertAccessibleAnsiRamp = (
  ramp: readonly string[],
  background: string,
  options: ContrastCheckOptions = {},
): void => {
  const minContrast = options.minContrast ?? 4.5;
  const label = options.label ? `${options.label}: ` : '';
  const failures = validateAnsiRamp(ramp, background, minContrast);

  if (failures.length === 0) return;

  const formatted = failures
    .map((failure) =>
      `index ${failure.index} (${failure.color}) contrast ${failure.contrast.toFixed(
        2,
      )}:1 < ${failure.required}`,
    )
    .join('; ');

  throw new Error(`${label}failed contrast check - ${formatted}`);
};

export const getRampMinContrast = (
  ramp: readonly string[],
  background: string,
): number => {
  if (ramp.length === 0) return Infinity;
  const normalizedBackground = normalizeHex(background);
  const backgroundLuminance = relativeLuminance(normalizedBackground);
  let min = Infinity;
  for (const color of ramp) {
    const normalizedColor = normalizeHex(color);
    const colorLuminance = relativeLuminance(normalizedColor);
    const lighter = Math.max(colorLuminance, backgroundLuminance);
    const darker = Math.min(colorLuminance, backgroundLuminance);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    if (ratio < min) min = ratio;
  }
  return min;
};
