export const PSEUDO_PREFIX = '\u202a⟦';
export const PSEUDO_SUFFIX = '⟧\u202c';

const ACCENT_MAP: Record<string, string> = {
  a: 'å',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'ë',
  f: 'ƒ',
  g: 'ğ',
  h: 'ĥ',
  i: 'ï',
  j: 'ĵ',
  k: 'ķ',
  l: 'ľ',
  m: 'm',
  n: 'ñ',
  o: 'ø',
  p: 'þ',
  q: 'ǫ',
  r: 'ř',
  s: 'š',
  t: 'ť',
  u: 'ü',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ÿ',
  z: 'ž',
};

const PADDING_SEQUENCE = [' ', '¡', '¿', 'ː'];

function accentCharacter(char: string): string {
  const lower = char.toLowerCase();
  const mapped = ACCENT_MAP[lower];
  if (!mapped) return char;
  return char === lower ? mapped : mapped.toUpperCase();
}

function expand(core: string): string {
  const targetLength = Math.ceil(core.length * 1.3);
  if (core.length >= targetLength) return core;
  const needed = targetLength - core.length;
  let result = core;
  for (let i = 0; i < needed; i += 1) {
    result += PADDING_SEQUENCE[i % PADDING_SEQUENCE.length];
  }
  return result;
}

export function pseudoLocalize(input: string): string {
  if (!input) return input;

  const leading = input.match(/^\s+/)?.[0] ?? '';
  const trailing = input.match(/\s+$/)?.[0] ?? '';
  const core = input.trim();
  if (!core) return input;

  const accented = Array.from(core)
    .map((char) => accentCharacter(char))
    .join('');

  const expanded = expand(accented);
  return `${leading}${PSEUDO_PREFIX}${expanded}${PSEUDO_SUFFIX}${trailing}`;
}

export function isPseudoLocalized(value: string): boolean {
  if (!value) return false;
  return value.includes('⟦') && value.includes('⟧');
}
