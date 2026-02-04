export interface Invader {
  x: number;
  y: number;
  alive: boolean;
}

export interface Shield {
  x: number;
  y: number;
  hp: number;
}

export interface UFO {
  active: boolean;
  x: number;
  y: number;
  dir: number;
}

export interface GameState {
  stage: number;
  invaders: Invader[];
  shields: Shield[];
  ufo: UFO;
}

const COLS = 8;
const SPACING = 30;

export const createShields = (): Shield[] => [
  { x: SPACING * 2, y: 0, hp: 6 },
  { x: SPACING * 4, y: 0, hp: 6 },
  { x: SPACING * 6, y: 0, hp: 6 },
];

export const createWave = (stage: number): Invader[] => {
  const rows = 4 + (stage - 1);
  const inv: Invader[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      inv.push({ x: c * SPACING, y: r * SPACING, alive: true });
    }
  }
  return inv;
};

export const createGame = (): GameState => ({
  stage: 1,
  invaders: createWave(1),
  shields: createShields(),
  ufo: { active: false, x: 0, y: 15, dir: 1 },
});

export const advanceWave = (state: GameState) => {
  if (state.invaders.every((i) => !i.alive)) {
    state.stage += 1;
    state.invaders = createWave(state.stage);
    state.shields = createShields();
    state.ufo.active = false;
  }
};

export const spawnUFO = (state: GameState) => {
  state.ufo = { active: true, x: 0, y: 15, dir: 1 };
};
