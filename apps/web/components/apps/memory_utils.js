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

export function fisherYatesShuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createDeck(size, type = 'emoji', patternTheme = 'vibrant') {
  const pairs = (size * size) / 2;
  let selected;
  if (type === 'pattern') {
    selected = buildPatternDeck(patternTheme).slice(0, pairs);
  } else if (type === 'letters') {
    selected = LETTERS.slice(0, pairs);
  } else {
    selected = EMOJIS.slice(0, pairs).map((value) => ({ value }));
  }
  const doubled = [...selected, ...selected].map((card, index) => ({ id: index, ...card }));
  return fisherYatesShuffle(doubled);
}

export { buildPatternDeck };

