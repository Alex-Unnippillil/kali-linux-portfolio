const ACCENT_MAP: Record<string, string> = {
  a: 'á',
  A: 'Á',
  b: 'ƀ',
  B: 'Ƀ',
  c: 'ç',
  C: 'Ç',
  d: 'đ',
  D: 'Đ',
  e: 'ē',
  E: 'Ē',
  f: 'ƒ',
  F: 'Ƒ',
  g: 'ğ',
  G: 'Ğ',
  h: 'ħ',
  H: 'Ħ',
  i: 'ī',
  I: 'Ī',
  j: 'ĵ',
  J: 'Ĵ',
  k: 'ķ',
  K: 'Ķ',
  l: 'ľ',
  L: 'Ľ',
  m: 'ṁ',
  M: 'Ṁ',
  n: 'ņ',
  N: 'Ņ',
  o: 'ō',
  O: 'Ō',
  p: 'ṕ',
  P: 'Ṕ',
  q: 'ʠ',
  Q: 'Ɋ',
  r: 'ř',
  R: 'Ř',
  s: 'š',
  S: 'Š',
  t: 'ť',
  T: 'Ť',
  u: 'ū',
  U: 'Ū',
  v: 'ṽ',
  V: 'Ṽ',
  w: 'ŵ',
  W: 'Ŵ',
  x: 'ẋ',
  X: 'Ẍ',
  y: 'ẏ',
  Y: 'Ÿ',
  z: 'ž',
  Z: 'Ž',
};

const PLACEHOLDER_PATTERN = /(\{[^{}]+\}|%\w|<\d+>|\$\{[^{}]+\}|&[a-z]+;)/gi;

const EXPANSION_PADDING = ['¡', '¿', '•', '¤'];

export interface PseudolocalizeOptions {
  /**
   * Amount of padding to apply relative to the original string length.
   * Value is a multiplier where 0.3 represents 30% expansion.
   */
  expansionFactor?: number;
  /**
   * Whether to wrap the output in directional brackets.
   */
  bracket?: boolean;
}

const transformSegment = (segment: string): string => {
  let transformed = '';
  for (let i = 0; i < segment.length; i += 1) {
    const char = segment[i];
    if (ACCENT_MAP[char]) {
      transformed += ACCENT_MAP[char];
    } else {
      transformed += char;
    }
  }
  return transformed;
};

const pad = (value: string, factor: number): string => {
  if (factor <= 0) return value;
  const padLength = Math.max(0, Math.round(value.length * factor));
  if (padLength === 0) return value;
  const buffer: string[] = [];
  for (let i = 0; i < padLength; i += 1) {
    buffer.push(EXPANSION_PADDING[i % EXPANSION_PADDING.length]);
  }
  return `${value} ${buffer.join('')}`;
};

export const pseudolocalize = (
  input: string,
  options: PseudolocalizeOptions = {},
): string => {
  if (!input) return input;
  const { expansionFactor = 0.3, bracket = true } = options;
  const segments: string[] = [];
  let lastIndex = 0;
  const matches = input.matchAll(PLACEHOLDER_PATTERN);

  for (const match of matches) {
    const [placeholder] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push(transformSegment(input.slice(lastIndex, index)));
    }
    segments.push(placeholder);
    lastIndex = index + placeholder.length;
  }

  if (lastIndex < input.length) {
    segments.push(transformSegment(input.slice(lastIndex)));
  }

  const expanded = pad(segments.join(''), expansionFactor);
  if (!bracket) {
    return expanded;
  }
  return `⟦${expanded}⟧`;
};
