import React from 'react';
import InputRemap from './Games/common/input-remap/InputRemap';
import useInputMapping from './Games/common/input-remap/useInputMapping';

interface HelpOverlayProps {
  gameId: string;
  onClose: () => void;
}

interface Instruction {
  objective: string;
  controls: string;
  actions?: Record<string, string>;
}

export const GAME_INSTRUCTIONS: Record<string, Instruction> = {
  '2048': {
    objective: 'Reach the 2048 tile by merging numbers.',
    controls: 'Use the arrow keys to slide and combine tiles.',
    actions: {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
    },
  },
  asteroids: {
    objective: 'Destroy asteroids without crashing your ship.',
    controls: 'Arrow keys to rotate and thrust, space to fire.',
  },
  battleship: {
    objective: 'Sink all enemy ships before they sink yours.',
    controls: 'Click cells to place ships and fire shots.',
  },
  blackjack: {
    objective: 'Get as close to 21 as possible without busting.',
    controls: 'Use on-screen buttons to hit or stand.',
  },
  breakout: {
    objective: 'Clear all bricks with the ball.',
    controls: 'Move the paddle with the arrow keys.',
  },
  'car-racer': {
    objective: 'Avoid other cars and stay on the road.',
    controls: 'Arrow keys steer, space for brake if available.',
  },
  checkers: {
    objective: 'Capture all opponent pieces or block their moves.',
    controls: 'Click a piece then a destination square.',
  },
  chess: {
    objective: 'Checkmate the opposing king.',
    controls: 'Click or drag pieces to legal squares.',
  },
  'connect-four': {
    objective: 'Get four of your discs in a row.',
    controls: 'Click a column to drop a disc.',
  },
  frogger: {
    objective: 'Cross the road and river to reach the goal.',
    controls: 'Use the arrow keys to move the frog.',
  },
  hangman: {
    objective: 'Guess the word before the hangman is complete.',
    controls: 'Type letters or use the on-screen keyboard.',
  },
  memory: {
    objective: 'Match all pairs of cards.',
    controls: 'Click two cards to reveal and match.',
  },
  minesweeper: {
    objective: 'Clear the board without hitting mines.',
    controls: 'Left-click to reveal, right-click to flag.',
  },
  pacman: {
    objective: 'Eat all pellets while avoiding ghosts.',
    controls: 'Use the arrow keys to move.',
  },
  platformer: {
    objective: 'Reach the end of the level.',
    controls: 'Arrow keys move, up to jump.',
  },
  pong: {
    objective: 'Hit the ball past your opponent.',
    controls: 'Use arrow keys or W/S to move the paddle.',
  },
  reversi: {
    objective: 'Control the most discs on the board.',
    controls: 'Click a square to place a disc and flip others.',
  },
  simon: {
    objective: 'Repeat the sequence of lights and sounds.',
    controls: 'Click the colored pads in order.',
  },
  snake: {
    objective: 'Grow by eating food and avoid collisions.',
    controls: 'Arrow keys to move, space to pause.',
  },
  sokoban: {
    objective: 'Push all boxes onto target squares.',
    controls: 'Use arrow keys to move and push boxes.',
  },
  solitaire: {
    objective: 'Move all cards to the foundation piles.',
    controls: 'Click and drag cards to new positions.',
  },
  tictactoe: {
    objective: 'Place three marks in a row to win.',
    controls: 'Click a square to place your mark.',
  },
  tetris: {
    objective: 'Clear lines by completing horizontal rows.',
    controls: 'Arrow keys move, up rotates, space drops.',
  },
  'tower-defense': {
    objective: 'Stop enemies before they reach the end.',
    controls: 'Click to place and upgrade towers.',
  },
  'word-search': {
    objective: 'Find all listed words in the grid.',
    controls: 'Click or swipe across letters to select words.',
  },
  wordle: {
    objective: 'Guess the hidden word in six tries.',
    controls: 'Type letters and press Enter to submit.',
  },
  nonogram: {
    objective: 'Fill cells according to row and column clues.',
    controls: 'Left-click to fill, right-click to mark empty.',
  },
  'space-invaders': {
    objective: 'Defeat the alien waves.',
    controls: 'Arrow keys move, space to shoot.',
  },
  sudoku: {
    objective: 'Fill the grid so each row, column, and box has 1-9.',
    controls: 'Click a cell then type a number.',
  },
  'flappy-bird': {
    objective: 'Fly through gaps between pipes. Practice gates and easy mode available.',
    controls: 'Space/click to flap. P: practice, G: easy gravity, M: reduced motion.',
  },
  'candy-crush': {
    objective: 'Match three candies to clear them.',
    controls: 'Swap adjacent candies by dragging or clicking.',
  },
  gomoku: {
    objective: 'Get five stones in a row.',
    controls: 'Click a grid intersection to place a stone.',
  },
  pinball: {
    objective: 'Score points by hitting targets.',
    controls: 'Left/right arrows control flippers, space to launch.',
  },
};

const HelpOverlay: React.FC<HelpOverlayProps> = ({ gameId, onClose }) => {
  const info = GAME_INSTRUCTIONS[gameId];
  const [mapping, setKey] = useInputMapping(gameId, info?.actions || {});
  if (!info) return null;
  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md p-4 bg-gray-800 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-2">{gameId} Help</h2>
        <p className="mb-2"><strong>Objective:</strong> {info.objective}</p>
        {info.actions ? (
          <>
            <p>
              <strong>Controls:</strong>{' '}
              {Object.entries(mapping)
                .map(([a, k]) => `${a}: ${k}`)
                .join(', ')}
            </p>
            <div className="mt-2">
              <InputRemap mapping={mapping} setKey={setKey} actions={info.actions} />
            </div>
          </>
        ) : (
          <p>
            <strong>Controls:</strong> {info.controls}
          </p>
        )}
        <button
          onClick={onClose}
          className="mt-4 px-3 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
          autoFocus
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default HelpOverlay;
