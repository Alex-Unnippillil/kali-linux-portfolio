// Basic dictionaries used by the hangman game. Having them here keeps the
// engine self‑contained so consumers do not need to supply their own word
// lists.
export const FAMILY_WORDS = [
    'mother',
    'father',
    'sister',
    'brother',
    'cousin',
    'uncle',
    'aunt',
];
export const SAT_WORDS = [
    'aberration',
    'convivial',
    'equivocate',
    'laconic',
    'obdurate',
    'quandary',
    'venerate',
];
export const MOVIE_WORDS = [
    'inception',
    'avatar',
    'casablanca',
    'gladiator',
    'titanic',
    'goodfellas',
    'amelie',
];
export const DICTIONARIES = {
    family: FAMILY_WORDS,
    sat: SAT_WORDS,
    movie: MOVIE_WORDS,
};
export const WORDS = [
    ...FAMILY_WORDS,
    ...SAT_WORDS,
    ...MOVIE_WORDS,
];
export const createGame = (word) => {
    const chosen = word || WORDS[Math.floor(Math.random() * WORDS.length)];
    return {
        word: chosen,
        guessed: [],
        wrong: 0,
    };
};
export const guess = (game, letter) => {
    letter = letter.toLowerCase();
    if (game.guessed.includes(letter))
        return game.word.includes(letter);
    game.guessed.push(letter);
    if (!game.word.includes(letter)) {
        game.wrong += 1;
        return false;
    }
    return true;
};
export const useHint = (game) => {
    const remaining = game.word
        .split('')
        .filter((l) => !game.guessed.includes(l));
    if (remaining.length === 0)
        return null;
    const unique = Array.from(new Set(remaining));
    const reveal = unique[Math.floor(Math.random() * unique.length)];
    game.guessed.push(reveal);
    return reveal;
};
export const isWinner = (game) => game.word.split('').every((l) => game.guessed.includes(l));
export const isLoser = (game, maxWrong = 6) => game.wrong >= maxWrong;
export const isGameOver = (game, maxWrong = 6) => isWinner(game) || isLoser(game, maxWrong);
