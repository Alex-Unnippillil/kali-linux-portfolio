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

export function fisherYatesShuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createDeck(size, images = []) {
  const pairs = (size * size) / 2;

  // Take as many uploaded images as needed for pairs
  const selectedImages = images.slice(0, pairs).map((src) => ({ type: 'image', value: src }));
  const remainingPairs = pairs - selectedImages.length;

  // Use emojis to fill any remaining pairs
  const selectedEmojis = EMOJIS.slice(0, remainingPairs).map((value) => ({ type: 'emoji', value }));

  const combined = [...selectedImages, ...selectedEmojis];

  const doubled = combined.flatMap((item, index) => [
    { id: index * 2, ...item },
    { id: index * 2 + 1, ...item },
  ]);

  return fisherYatesShuffle(doubled);
}
