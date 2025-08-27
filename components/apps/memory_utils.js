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

export function createSeededRNG(seed) {
  let s;
  if (typeof seed === 'string') {
    s = 0;
    for (let i = 0; i < seed.length; i++) {
      s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    }
  } else {
    s = seed >>> 0;
  }
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function fisherYatesShuffle(array, rng = Math.random) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function selectWeightedEmojis(pairs, stats, rng) {
  const weighted = [];
  EMOJIS.forEach((emoji) => {
    const record = stats[emoji] || { success: 0, fail: 0 };
    const weight = Math.max(1, record.fail - record.success + 1);
    for (let i = 0; i < weight; i++) {
      weighted.push(emoji);
    }
  });
  const shuffled = fisherYatesShuffle(weighted, rng);
  const selected = [];
  for (const val of shuffled) {
    if (!selected.includes(val)) {
      selected.push(val);
      if (selected.length === pairs) break;
    }
  }
  return selected;
}

export function createDeck(size, options = {}) {
  const { seed, practice, practiceStats = {} } = options;
  const rng = seed !== undefined && seed !== '' ? createSeededRNG(seed) : Math.random;
  const pairs = (size * size) / 2;
  let selected;
  if (practice) {
    selected = selectWeightedEmojis(pairs, practiceStats, rng);
  } else {
    selected = fisherYatesShuffle(EMOJIS, rng).slice(0, pairs);
  }
  const doubled = [...selected, ...selected].map((value, index) => ({ id: index, value }));
  return fisherYatesShuffle(doubled, rng);
}
