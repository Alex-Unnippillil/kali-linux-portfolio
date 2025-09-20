import React, { useEffect, useRef } from "react";
import InputRemap from "./Games/common/input-remap/InputRemap";

type OverlayView = "help" | "pause";

interface OverlayLegendEntry {
  label: string;
  description: string;
}

interface HelpOverlayProps {
  gameId: string;
  view: OverlayView;
  onClose: () => void;
  onViewChange: (view: OverlayView) => void;
  onResume: () => void;
  onRestart?: () => void;
  paused: boolean;
  mapping: Record<string, string>;
  setKey: (action: string, key: string) => string | null;
  overlayLegend: OverlayLegendEntry[];
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

const HelpOverlay: React.FC<HelpOverlayProps> = ({
  gameId,
  view,
  onClose,
  onViewChange,
  onResume,
  onRestart,
  paused,
  mapping,
  setKey,
  overlayLegend,
}) => {
  const info = GAME_INSTRUCTIONS[gameId];
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const pauseTabId = `${gameId}-overlay-tab-pause`;
  const helpTabId = `${gameId}-overlay-tab-help`;
  const pausePanelId = `${gameId}-overlay-panel-pause`;
  const helpPanelId = `${gameId}-overlay-panel-help`;

  const describeKey = (key: string) => {
    if (!key) return "";
    if (key === " ") return "Space";
    if (key === "ArrowUp") return "Arrow Up";
    if (key === "ArrowDown") return "Arrow Down";
    if (key === "ArrowLeft") return "Arrow Left";
    if (key === "ArrowRight") return "Arrow Right";
    return key.length === 1 ? key.toUpperCase() : key;
  };

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
  }, [onClose, view]);

  const renderControlsSummary = () => {
    if (!info) {
      return "Use on-screen prompts to interact.";
    }
    if (!info.actions) {
      return info.controls;
    }
    return Object.entries(info.actions)
      .map(([action, defaultKey]) => {
        const activeKey = describeKey(mapping[action] ?? defaultKey);
        return `${action}: ${activeKey}`;
      })
      .join(", ");
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={view === "pause" ? pauseTabId : helpTabId}
    >
      <div className="w-full max-w-2xl bg-gray-800 rounded shadow-lg p-4 sm:p-6 space-y-4" role="document">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Game menu</h2>
            <p className="text-sm text-gray-300">
              Switch between pause controls and how-to-play guidance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded bg-gray-700 px-3 py-1 text-sm focus:outline-none focus:ring"
          >
            Close
          </button>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Overlay sections"
        >
          <button
            id={pauseTabId}
            type="button"
            role="tab"
            aria-selected={view === "pause"}
            aria-controls={pausePanelId}
            tabIndex={view === "pause" ? 0 : -1}
            onClick={() => onViewChange("pause")}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                onViewChange("help");
              }
            }}
            className={`rounded px-3 py-1 text-sm focus:outline-none focus:ring ${
              view === "pause"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-200"
            }`}
          >
            Pause
          </button>
          <button
            id={helpTabId}
            type="button"
            role="tab"
            aria-selected={view === "help"}
            aria-controls={helpPanelId}
            tabIndex={view === "help" ? 0 : -1}
            onClick={() => onViewChange("help")}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                onViewChange("pause");
              }
            }}
            className={`rounded px-3 py-1 text-sm focus:outline-none focus:ring ${
              view === "help"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-200"
            }`}
          >
            How to play
          </button>
        </div>
        <div className="space-y-4">
          <div
            id={pausePanelId}
            role="tabpanel"
            aria-labelledby={pauseTabId}
            hidden={view !== "pause"}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold">Game paused</h3>
            <p className="text-sm text-gray-300">
              Use the buttons below to resume, restart, or review the controls.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onResume}
                className="rounded bg-blue-600 px-3 py-1 text-sm focus:outline-none focus:ring"
              >
                Resume
              </button>
              {onRestart && (
                <button
                  type="button"
                  onClick={onRestart}
                  className="rounded bg-gray-700 px-3 py-1 text-sm focus:outline-none focus:ring"
                >
                  Restart
                </button>
              )}
              <button
                type="button"
                onClick={() => onViewChange("help")}
                className="rounded bg-gray-700 px-3 py-1 text-sm focus:outline-none focus:ring"
              >
                View controls
              </button>
            </div>
          </div>
          <div
            id={helpPanelId}
            role="tabpanel"
            aria-labelledby={helpTabId}
            hidden={view !== "help"}
            className="space-y-3"
          >
            {paused && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onResume}
                  className="rounded bg-blue-600 px-3 py-1 text-sm focus:outline-none focus:ring"
                >
                  Resume game
                </button>
                <button
                  type="button"
                  onClick={() => onViewChange("pause")}
                  className="rounded bg-gray-700 px-3 py-1 text-sm focus:outline-none focus:ring"
                >
                  Pause options
                </button>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold">Objective</h3>
              <p className="text-sm text-gray-200">
                {info?.objective ?? "Explore the controls below to get started."}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Controls</h3>
              {info?.actions ? (
                <>
                  <p className="text-sm text-gray-200">
                    Customize the keys below to match your preferences.
                  </p>
                  <p className="text-sm text-gray-300">{renderControlsSummary()}</p>
                  <div className="mt-2">
                    <InputRemap mapping={mapping} setKey={setKey} actions={info.actions} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-200">{renderControlsSummary()}</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-gray-700 px-3 py-1 text-sm focus:outline-none focus:ring"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        {overlayLegend.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
              Overlay shortcuts
            </h3>
            <ul className="space-y-1 text-sm text-gray-300">
              {overlayLegend.map((entry) => (
                <li
                  key={`${entry.label}-${entry.description}`}
                  className="flex justify-between gap-2"
                >
                  <span className="font-mono text-gray-100 whitespace-nowrap">
                    {entry.label}
                  </span>
                  <span className="text-right">{entry.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpOverlay;
