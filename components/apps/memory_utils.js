export const EMOJIS = [
  '\u{1F34E}', // apple
  '\u{1F34C}', // banana
  '\u{1F347}', // grapes
  '\u{1F353}', // strawberry
  '\u{1F34D}', // pineapple
  '\u{1F95D}', // kiwi
  '\u{1F351}', // peach
  '\u{1F951}', // avocado
  '\u{1F346}', // eggplant
  '\u{1F955}', // carrot
  '\u{1F33D}', // ear of corn
  '\u{1F954}', // potato
  '\u{1F34A}', // tangerine
  '\u{1F350}', // pear
  '\u{1F965}', // coconut
  '\u{1FAD0}', // blueberry
  '\u{1F96D}', // mango
  '\u{1F345}', // tomato
];

// Build pattern decks using distinct shapes and multiple color themes
const SHAPES = ['\u25B2', '\u25A0', '\u25CF', '\u25C6', '\u2605', '\u271A', '\u25B3', '\u25A1'];
const BASE_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  'orange',
  'teal',
  'lime',
  'indigo',
  'amber',
  'rose',
  'sky',
  'fuchsia',
  'violet',
  'cyan',
  'emerald',
  'gray',
];

export const PATTERN_THEMES = {
  vibrant: BASE_COLORS.map((c) => `text-${c}-600`),
  pastel: BASE_COLORS.map((c) => `text-${c}-300`),
  mono: BASE_COLORS.map((_, i) => `text-gray-${(i % 9 + 1) * 100}`),
};

function buildPatternDeck(theme = 'vibrant') {
  const colors = PATTERN_THEMES[theme] || PATTERN_THEMES.vibrant;
  return colors.map((color, i) => ({ value: SHAPES[i % SHAPES.length], color }));
}

// Simple letter deck
export const LETTERS = Array.from({ length: 26 }, (_, i) => ({ value: String.fromCharCode(65 + i) }));

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed) {
  const seedStr = String(seed ?? '');
  const h = xmur3(seedStr)();
  return mulberry32(h);
}

export function generateSeed() {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint32Array(2);
      crypto.getRandomValues(buf);
      return `${buf[0].toString(16)}${buf[1].toString(16)}`;
    }
  } catch {}
  return Math.floor(Math.random() * 1e9).toString(16);
}

export function fisherYatesShuffle(array, rng = Math.random) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createDeck(size, type = 'emoji', patternTheme = 'vibrant', seed) {
  const pairs = (size * size) / 2;
  const rng = seed != null ? createSeededRng(`deck:${seed}:${size}:${type}:${patternTheme}`) : Math.random;

  let pool;
  if (type === 'pattern') {
    pool = buildPatternDeck(patternTheme).map((card, i) => ({
      ...card,
      pairId: `${card.value}:${card.color}:${i}`,
    }));
  } else if (type === 'letters') {
    pool = LETTERS.map((c) => ({ ...c, pairId: c.value }));
  } else {
    pool = EMOJIS.map((value) => ({ value, pairId: value }));
  }

  const selected = fisherYatesShuffle(pool, rng).slice(0, pairs);
  const doubled = [...selected, ...selected].map((card, index) => ({ id: index, ...card }));

  return fisherYatesShuffle(doubled, rng);
}

export { buildPatternDeck };

