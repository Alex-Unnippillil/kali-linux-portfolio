import React, { useEffect, useRef } from "react";
import InputRemap from "./Games/common/input-remap/InputRemap";
import useInputMapping from "./Games/common/input-remap/useInputMapping";

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
  "2048": {
    objective: "Reach the 2048 tile by merging numbers.",
    controls: "Use the arrow keys to slide and combine tiles.",
    actions: {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    },
  },
  asteroids: {
    objective: "Destroy asteroids without crashing your ship.",
    controls: "Arrow keys to rotate and thrust, space to fire.",
    actions: {
      left: "ArrowLeft",
      right: "ArrowRight",
      thrust: "ArrowUp",
      fire: " ",
      hyperspace: "h",
    },
  },
  battleship: {
    objective: "Sink all enemy ships before they sink yours.",
    controls: "Click cells to place ships and fire shots.",
  },
  blackjack: {
    objective: "Get as close to 21 as possible without busting.",
    controls: "Use on-screen buttons to hit or stand.",
    actions: {
      deal: "Enter",
      hit: "h",
      stand: "s",
      double: "d",
      split: "p",
      surrender: "r",
      chip1: "1",
      chip5: "2",
      chip25: "3",
      chip100: "4",
    },
  },
  breakout: {
    objective: "Clear all bricks with the ball.",
    controls:
      "Mouse or touch to move the paddle. Arrow keys also work. Space launches the ball and releases magnet catches.",
    actions: {
      left: "ArrowLeft",
      right: "ArrowRight",
      fire: " ",
    },
  },
  "car-racer": {
    objective: "Avoid other cars and stay on the road.",
    controls: "Arrow keys steer, space for brake if available.",
  },
  "lane-runner": {
    objective: "Dodge obstacles by switching lanes and survive as speed ramps up.",
    controls:
      "Arrow keys or swipe left/right to change lanes. Space pauses. R restarts after game over. Optional tilt controls can be enabled in Settings.",
    actions: {
      left: "ArrowLeft",
      right: "ArrowRight",
      pause: " ",
      restart: "r",
    },
  },
  checkers: {
    objective: "Capture all opponent pieces or block their moves.",
    controls: "Click a piece then a destination square.",
  },
  chess: {
    objective: "Checkmate the opposing king.",
    controls: "Click or drag pieces to legal squares.",
  },
  "connect-four": {
    objective: "Get four of your discs in a row.",
    controls: "Left/Right select column, Space drops, or click a column.",
  },
  frogger: {
    objective: "Cross the road and river to reach the goal.",
    controls: "Use the arrow keys to move the frog.",
  },
  hangman: {
    objective: "Guess the word before the hangman is complete.",
    controls: "Type letters or use the on-screen keyboard.",
  },
  memory: {
    objective: "Match all pairs of cards.",
    controls:
      "Click two cards to reveal and match. Arrow keys move focus, Enter/Space flips, P pauses, R resets, Escape toggles pause.",
  },
  minesweeper: {
    objective: "Clear the board without hitting mines.",
    controls:
      "Left-click to reveal, right-click or F to flag. Arrow keys move, Enter or Space reveals, P pauses, N resets.",
  },
  pacman: {
    objective: "Eat all pellets while avoiding ghosts.",
    controls: "Use the arrow keys to move.",
  },
  platformer: {
    objective: "Reach the end of the level.",
    controls: "Arrow keys move, up to jump.",
  },
  pong: {
    objective: "Hit the ball past your opponent.",
    controls: "Use arrow keys or W/S to move the paddle.",
  },
  reversi: {
    objective: "Control the most discs on the board.",
    controls: "Click a square to place a disc and flip others.",
  },
  simon: {
    objective: "Repeat the sequence of lights and sounds.",
    controls:
      "Click the pads in order, or use 1-4 / Q-W-A-S. N starts a new game and Space/Enter activates focused pads.",
  },
  snake: {
    objective: "Grow by eating food and avoid collisions.",
    controls: "Arrow keys or swipe to move, Space to pause, R to restart.",
  },
  sokoban: {
    objective: "Push all boxes onto target squares.",
    controls:
      "Use arrow keys to move and push boxes. U/Z/Backspace to undo, Y to redo, R to reset.",
  },
  solitaire: {
    objective: "Move all cards to the foundation piles.",
    controls: "Click and drag cards to new positions.",
  },
  tictactoe: {
    objective: "Place three marks in a row to win.",
    controls: "Click a square to place your mark.",
  },
  tetris: {
    objective: "Clear lines by completing horizontal rows.",
    controls: "Arrow keys move, up rotates, space drops.",
  },
  "tower-defense": {
    objective: "Stop enemies before they reach the goal.",
    controls:
      "Edit Route: click cells to paint the path (first is start, last is goal). Play: click to place/select towers, right-click to sell. Keyboard: arrows move cursor, Enter/Space paint/place, Delete/Backspace sells, Esc clears selection, P pauses.",
  },
  "word-search": {
    objective: "Find all listed words in the grid.",
    controls: "Click or swipe across letters to select words.",
  },
  wordle: {
    objective: "Guess the hidden word in six tries.",
    controls: "Type letters and press Enter to submit.",
  },
  nonogram: {
    objective: "Fill cells according to row and column clues.",
    controls: "Left-click to fill, right-click to mark empty.",
  },
  "space-invaders": {
    objective: "Defeat the alien waves.",
    controls: "Arrow keys move, space to shoot.",
  },
  sudoku: {
    objective: "Fill the grid so each row, column, and box has 1-9.",
    controls:
      "Click a cell then type a number. Toggle Notes or hold Shift for pencil marks. Conflicts highlight automatically. Choose a difficulty and use Hint for human strategies.",
  },
  "flappy-bird": {
    objective:
      "Fly through gaps between pipes. Practice gates, slow-motion, easy mode, and skins available.",
    controls:
      "Space/click to flap. P: practice, G: easy gravity, M: reduced motion, O: pipe skin, H: hitbox preview, R: replay, Shift+R: best run.",
  },
  "candy-crush": {
    objective: "Match three candies to clear them.",
    controls:
      "Swap adjacent candies by dragging or clicking. Use the overlay to pause or mute, and the booster buttons to shuffle or detonate color bombs.",
  },
  gomoku: {
    objective: "Get five stones in a row before your opponent.",
    controls:
      "Click a grid intersection to place a stone. Use the toolbar to switch between local and AI play, adjust difficulty, toggle sound, or reset the board.",
  },
  pinball: {
    objective: "Score points by hitting targets.",
    controls: "Left/right arrows control flippers, space to launch.",
  },
};

const HelpOverlay: React.FC<HelpOverlayProps> = ({ gameId, onClose }) => {
  const info = GAME_INSTRUCTIONS[gameId];
  const [mapping, setKey] = useInputMapping(gameId, info?.actions || {});
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const noop = () => null;

  useEffect(() => {
    if (!overlayRef.current) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const selectors =
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(
      overlayRef.current.querySelectorAll<HTMLElement>(selectors),
    );
    focusables[0]?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const node = overlayRef.current;
    node.addEventListener("keydown", handleKey);
    return () => {
      node.removeEventListener("keydown", handleKey);
      prevFocus.current?.focus();
    };
  }, [onClose]);

  if (!info) return null;
  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md p-4 bg-gray-800 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-2">{gameId} Help</h2>
        <p className="mb-2">
          <strong>Objective:</strong> {info.objective}
        </p>
        {info.actions ? (
          <>
            <p>
              <strong>Controls:</strong>{" "}
              {Object.entries(mapping)
                .map(([a, k]) => `${a}: ${k}`)
                .join(", ")}
            </p>
            <div className="mt-2">
              <InputRemap
                mapping={mapping}
                setKey={setKey as (action: string, key: string) => string | null}
                actions={info.actions}
              />
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
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default HelpOverlay;
