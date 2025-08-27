import { computeLegalMoves, applyMove, countPieces } from '../components/apps/reversiLogic';

type Board = (('B' | 'W' | null)[])[];
type Player = 'B' | 'W';

interface MoveEntry {
  key: string | null;
  flips: Array<[number, number]>;
}

interface Node {
  board: Board;
  player: Player;
  parent?: Node;
  move: [number, number] | null;
  children: Node[];
  wins: number;
  visits: number;
  untriedMoves: MoveEntry[];
}

const cloneBoard = (board: Board): Board => board.map((row) => row.slice());

const getMoves = (board: Board, player: Player): MoveEntry[] => {
  const movesObj = computeLegalMoves(board, player);
  const entries = Object.entries(movesObj);
  if (entries.length === 0) {
    const opponent: Player = player === 'B' ? 'W' : 'B';
    const oppMoves = computeLegalMoves(board, opponent);
    if (Object.keys(oppMoves).length === 0) return [];
    return [{ key: null, flips: [] }];
  }
  return entries.map(([key, flips]) => ({ key, flips }));
};

const UCT_C = Math.sqrt(2);

const uct = (child: Node): number =>
  child.wins / child.visits +
  UCT_C * Math.sqrt(Math.log(child.parent!.visits) / child.visits);

const select = (node: Node): Node => {
  let current: Node = node;
  while (current.untriedMoves.length === 0 && current.children.length > 0) {
    current = current.children.reduce((best, c) => (uct(c) > uct(best) ? c : best));
  }
  return current;
};

const expand = (node: Node): Node => {
  if (node.untriedMoves.length === 0) return node;
  const idx = Math.floor(Math.random() * node.untriedMoves.length);
  const { key, flips } = node.untriedMoves.splice(idx, 1)[0];
  let newBoard = node.board;
  let move: [number, number] | null = null;
  let nextPlayer: Player = node.player === 'B' ? 'W' : 'B';
  if (key !== null) {
    const [r, c] = key.split('-').map(Number);
    newBoard = applyMove(node.board, r, c, node.player, flips);
    move = [r, c];
  }
  const child: Node = {
    board: newBoard,
    player: nextPlayer,
    parent: node,
    move,
    children: [],
    wins: 0,
    visits: 0,
    untriedMoves: getMoves(newBoard, nextPlayer),
  };
  node.children.push(child);
  return child;
};

const simulate = (board: Board, player: Player, rootPlayer: Player): number => {
  let currentBoard = cloneBoard(board);
  let currentPlayer: Player = player;
  let passCount = 0;
  while (true) {
    const movesObj = computeLegalMoves(currentBoard, currentPlayer);
    const entries = Object.entries(movesObj);
    if (entries.length === 0) {
      const opponent: Player = currentPlayer === 'B' ? 'W' : 'B';
      const oppMoves = computeLegalMoves(currentBoard, opponent);
      if (Object.keys(oppMoves).length === 0) break;
      passCount += 1;
      if (passCount === 2) break;
      currentPlayer = opponent;
      continue;
    }
    passCount = 0;
    const [key, flips] = entries[Math.floor(Math.random() * entries.length)];
    const [r, c] = key.split('-').map(Number);
    currentBoard = applyMove(currentBoard, r, c, currentPlayer, flips);
    currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
  }
  const { black, white } = countPieces(currentBoard);
  if (black === white) return 0.5;
  const winner: Player = black > white ? 'B' : 'W';
  return winner === rootPlayer ? 1 : 0;
};

const backprop = (node: Node, result: number) => {
  let current: Node | undefined = node;
  while (current) {
    current.visits += 1;
    current.wins += result;
    current = current.parent;
  }
};

const mcts = (board: Board, player: Player, playouts: number) => {
  const root: Node = {
    board: cloneBoard(board),
    player,
    parent: undefined,
    move: null,
    children: [],
    wins: 0,
    visits: 0,
    untriedMoves: getMoves(board, player),
  };

  for (let i = 0; i < playouts; i += 1) {
    let node = select(root);
    node = expand(node);
    const result = simulate(node.board, node.player, player);
    backprop(node, result);
  }

  let bestChild: Node | null = null;
  let bestVisits = -1;
  const scores: Record<string, number> = {};
  root.children.forEach((child) => {
    if (child.move) {
      const key = `${child.move[0]}-${child.move[1]}`;
      const rate = child.wins / child.visits;
      scores[key] = rate;
      if (child.visits > bestVisits) {
        bestVisits = child.visits;
        bestChild = child;
      }
    }
  });

  const move = bestChild ? bestChild.move : null;
  return { move, scores };
};

onmessage = (e) => {
  const { board, player, playouts } = e.data as {
    board: Board;
    player: Player;
    playouts?: number;
  };
  const limit = typeof playouts === 'number' ? playouts : 1000;
  const { move, scores } = mcts(board, player, limit);
  postMessage({ move, scores });
};
