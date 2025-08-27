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
  '\u{1F345}'  // tomato
];

// Accessible pattern deck using distinct shapes and colors
export const PATTERNS = [
  { value: '\u25B2', color: 'text-red-600' }, // triangle
  { value: '\u25A0', color: 'text-blue-600' }, // square
  { value: '\u25CF', color: 'text-green-600' }, // circle
  { value: '\u25C6', color: 'text-yellow-600' }, // diamond
  { value: '\u2605', color: 'text-purple-600' }, // star
  { value: '\u271A', color: 'text-pink-600' }, // plus
  { value: '\u25B3', color: 'text-orange-600' }, // outlined triangle
  { value: '\u25A1', color: 'text-teal-600' }, // outlined square
];

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
  } else {
    selected = EMOJIS.slice(0, pairs).map((value) => ({ value }));
  }
  const doubled = [...selected, ...selected].map((card, index) => ({ id: index, ...card }));
  return doubled;
}
