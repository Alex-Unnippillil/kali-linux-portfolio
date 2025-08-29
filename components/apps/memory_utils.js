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

// Build a large enough pattern deck using distinct shapes and colors
const SHAPES = ['\u25B2', '\u25A0', '\u25CF', '\u25C6', '\u2605', '\u271A', '\u25B3', '\u25A1'];
const COLORS = [
  'text-red-600',
  'text-blue-600',
  'text-green-600',
  'text-yellow-600',
  'text-purple-600',
  'text-pink-600',
  'text-orange-600',
  'text-teal-600',
  'text-lime-600',
  'text-indigo-600',
  'text-amber-600',
  'text-rose-600',
  'text-sky-600',
  'text-fuchsia-600',
  'text-violet-600',
  'text-cyan-600',
  'text-emerald-600',
  'text-gray-600',
];

export const PATTERNS = COLORS.map((color, i) => ({ value: SHAPES[i % SHAPES.length], color }));

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

export function createDeck(size, type = 'emoji') {
  const pairs = (size * size) / 2;
  let selected;
  if (type === 'pattern') {
    selected = PATTERNS.slice(0, pairs);
  } else if (type === 'letters') {
    selected = LETTERS.slice(0, pairs);
  } else {
    selected = EMOJIS.slice(0, pairs).map((value) => ({ value }));
  }
  const doubled = [...selected, ...selected].map((card, index) => ({ id: index, ...card }));
  return fisherYatesShuffle(doubled);
}
