// Utilities for the memory card game.

// Theme packs for the memory game. Each theme exposes at least 30 unique
// symbols so that all difficulty levels (up to 30 pairs) are supported.
export const THEME_PACKS = {
  fruits: [
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
    '\u{1F349}', // watermelon
    '\u{1F34B}', // lemon
    '\u{1F352}', // cherries
    '\u{1F34F}', // green apple
    '\u{1F36D}', // lollipop
    '\u{1F36E}', // custard
    '\u{1F36F}', // honey pot
    '\u{1F95C}', // peanuts
    '\u{1F966}', // broccoli
    '\u{1F968}', // canned food
    '\u{1F9C4}', // garlic
    '\u{1F9C5}', // onion
  ],
  animals: [
    '\u{1F436}', // dog
    '\u{1F431}', // cat
    '\u{1F42D}', // mouse
    '\u{1F98A}', // fox
    '\u{1F43B}', // bear
    '\u{1F43C}', // panda
    '\u{1F438}', // frog
    '\u{1F435}', // monkey
    '\u{1F425}', // chick
    '\u{1F419}', // octopus
    '\u{1F984}', // unicorn
    '\u{1F41D}', // bee
    '\u{1F981}', // lion
    '\u{1F42F}', // tiger
    '\u{1F40E}', // horse
    '\u{1F42E}', // cow
    '\u{1F437}', // pig
    '\u{1F430}', // rabbit
    '\u{1F418}', // elephant
    '\u{1F43A}', // wolf
    '\u{1F414}', // rooster
    '\u{1F427}', // penguin
    '\u{1F422}', // turtle
    '\u{1F41F}', // fish
    '\u{1F40B}', // whale
    '\u{1F42C}', // dolphin
    '\u{1F980}', // crab
    '\u{1F40C}', // snail
    '\u{1F989}', // owl
    '\u{1F98B}', // butterfly
  ],
  'high-contrast': Array.from({ length: 30 }, (_, i) => String(i + 1)),
};

// Fisher–Yates shuffle implementation.
export function fisherYatesShuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Create a shuffled deck for the given number of pairs and theme.
export function createDeck(pairs, theme = 'fruits') {
  const pack = THEME_PACKS[theme] || THEME_PACKS.fruits;
  const selected = pack.slice(0, pairs);
  const doubled = [...selected, ...selected].map((value, index) => ({ id: index, value }));
  return fisherYatesShuffle(doubled);
}

