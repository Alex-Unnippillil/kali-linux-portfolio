import seedrandom from 'seedrandom';
let rng = seedrandom('', { state: true });
export const random = () => rng();
export const reset = (seed) => {
    rng = seedrandom(seed ?? '', { state: true });
};
export const serialize = () => {
    return JSON.stringify(rng.state());
};
export const deserialize = (state) => {
    rng = seedrandom('', { state: JSON.parse(state) });
};
export default { random, reset, serialize, deserialize };
