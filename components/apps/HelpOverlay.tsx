import React, { useEffect, useId, useMemo, useRef, useState } from "react";
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
  },
  breakout: {
    objective: "Clear all bricks with the ball.",
    controls: "Move the paddle with the arrow keys.",
  },
  "car-racer": {
    objective: "Avoid other cars and stay on the road.",
    controls: "Arrow keys steer, space for brake if available.",
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
    controls: "Click two cards to reveal and match.",
  },
  minesweeper: {
    objective: "Clear the board without hitting mines.",
    controls: "Left-click to reveal, right-click to flag.",
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
    controls: "Click the colored pads in order.",
  },
  snake: {
    objective: "Grow by eating food and avoid collisions.",
    controls: "Arrow keys to move, space to pause.",
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
    objective: "Stop enemies before they reach the end.",
    controls:
      "Use Edit Map to draw paths, then click to place and upgrade towers.",
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
    controls: "Swap adjacent candies by dragging or clicking.",
  },
  gomoku: {
    objective: "Get five stones in a row.",
    controls: "Click a grid intersection to place a stone.",
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
  const [query, setQuery] = useState("");
  const filterInputId = useId();
  const filterStatusId = useId();

  useEffect(() => {
    if (!overlayRef.current) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const selectors =
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const node = overlayRef.current;
    const getFocusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(selectors)).filter(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
      );
    const focusables = getFocusables();
    focusables[0]?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const currentFocusables = getFocusables();
        if (currentFocusables.length === 0) return;
        const first = currentFocusables[0];
        const last = currentFocusables[currentFocusables.length - 1];
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
    node.addEventListener("keydown", handleKey);
    return () => {
      node.removeEventListener("keydown", handleKey);
      prevFocus.current?.focus();
    };
  }, [onClose]);

  const filteredActionKeys = useMemo(() => {
    if (!info?.actions) return [] as string[];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return Object.keys(info.actions);
    return Object.keys(info.actions).filter((action) => {
      const keyLabel = (mapping[action] ?? info.actions?.[action] ?? "").toLowerCase();
      return (
        action.toLowerCase().includes(normalized) || keyLabel.includes(normalized)
      );
    });
  }, [info, mapping, query]);

  const filteredActions = useMemo(() => {
    if (!info?.actions) return {} as Record<string, string>;
    return filteredActionKeys.reduce<Record<string, string>>((acc, action) => {
      acc[action] = info.actions![action];
      return acc;
    }, {});
  }, [filteredActionKeys, info]);

  const highlightMatches = React.useCallback(
    (text: string): React.ReactNode => {
      const trimmed = query.trim();
      if (!trimmed) return text;
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "ig");
      const parts = text.split(regex);
      if (parts.length === 1) return text;
      return parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-sm bg-yellow-300 px-0.5 text-black"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        ),
      );
    },
    [query],
  );

  const totalShortcuts = info?.actions ? Object.keys(info.actions).length : 0;
  const shortcutsStatus = info?.actions
    ? `${filteredActionKeys.length} of ${totalShortcuts} shortcuts shown`
    : null;

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
            <div className="mb-4" role="search">
              <label
                htmlFor={filterInputId}
                className="block text-sm font-medium text-gray-200"
              >
                Filter shortcuts
              </label>
              <input
                id={filterInputId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by action or key"
                className="mt-1 w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring focus:ring-blue-400"
                aria-describedby={shortcutsStatus ? filterStatusId : undefined}
              />
              {shortcutsStatus && (
                <p
                  id={filterStatusId}
                  role="status"
                  aria-live="polite"
                  className="mt-2 text-xs text-gray-300"
                >
                  {shortcutsStatus}
                </p>
              )}
            </div>
            <div>
              <p className="font-semibold">Controls:</p>
              {filteredActionKeys.length > 0 ? (
                <ul className="mt-1 space-y-1 text-sm" role="list">
                  {filteredActionKeys.map((action) => {
                    const keyBinding = mapping[action] ?? info.actions[action] ?? "";
                    return (
                      <li key={action} className="flex items-start justify-between gap-3">
                        <span className="capitalize">{highlightMatches(action)}</span>
                        <span className="font-mono">{highlightMatches(keyBinding)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-300" role="alert">
                  No shortcuts match “{query}”.
                </p>
              )}
            </div>
            <div className="mt-2">
              <InputRemap
                mapping={mapping}
                setKey={setKey as (action: string, key: string) => string | null}
                actions={filteredActions}
                highlightQuery={query}
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
