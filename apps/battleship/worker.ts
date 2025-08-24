import BattleshipAI, { CellState } from './ai';

const ai = new BattleshipAI();

interface ShotMsg {
  type: 'shot';
  board: CellState[][];
  difficulty: number;
}

interface MapMsg {
  type: 'map';
  board: CellState[][];
}

type Msg = ShotMsg | MapMsg;

self.onmessage = (e: MessageEvent<Msg>) => {
  const data = e.data;
  if (data.type === 'shot') {
    const shot = ai.nextShot(data.board, data.difficulty);
    (self as any).postMessage({ shot });
  } else if (data.type === 'map') {
    const map = ai.probability(data.board);
    (self as any).postMessage({ map });
  }
};

export {};
