import React, { useEffect, useRef, useState } from "react";
import InputRemap from "../apps/Games/common/input-remap/InputRemap";
import useInputMapping from "../apps/Games/common/input-remap/useInputMapping";

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

const RTL_LANGS = new Set([
  "ar",
  "arc",
  "dv",
  "fa",
  "ha",
  "he",
  "khw",
  "ks",
  "ku",
  "ps",
  "ur",
  "yi",
]);

const detectRTL = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  const root = document.documentElement;
  const body = document.body;
  const dirAttr =
    root?.getAttribute("dir") || body?.getAttribute("dir") || "";
  if (dirAttr) {
    return dirAttr.toLowerCase() === "rtl";
  }
  if (typeof window !== "undefined" && root) {
    try {
      const computed = window.getComputedStyle(root).direction;
      if (computed) {
        return computed === "rtl";
      }
    } catch {
      // Ignore failures when styles are not accessible.
    }
  }
  const langSource =
    root?.lang ||
    body?.lang ||
    (typeof navigator !== "undefined" ? navigator.language : "");
  const primary = langSource.toLowerCase().split("-")[0];
  return RTL_LANGS.has(primary);
};

const HelpOverlay: React.FC<HelpOverlayProps> = ({ gameId, onClose }) => {
  const info = GAME_INSTRUCTIONS[gameId];
  const [mapping, setKey] = useInputMapping(gameId, info?.actions || {});
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const evaluate = () => setIsRTL(detectRTL());
    evaluate();
    let observer: MutationObserver | undefined;
    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(evaluate);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["dir", "lang"],
      });
    }
    if (typeof window !== "undefined") {
      window.addEventListener("languagechange", evaluate);
    }
    return () => {
      observer?.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("languagechange", evaluate);
      }
    };
  }, []);

  const hasDirectionalActions = Boolean(
    info?.actions && ("left" in info.actions || "right" in info.actions)
  );
  const mentionsArrowKeys = Boolean(
    typeof info?.controls === "string" && /arrow/i.test(info.controls)
  );
  const showDirectionalNote = hasDirectionalActions || mentionsArrowKeys;
  const containerClasses = `max-w-md p-4 bg-gray-800 rounded shadow-lg${
    isRTL ? " text-right" : ""
  }`;
  const arrowGuidance = isRTL
    ? "Use \u2192 (ArrowRight) to move left and \u2190 (ArrowLeft) to move right."
    : "Use \u2190 (ArrowLeft) to move left and \u2192 (ArrowRight) to move right.";
  const wordJumpGuidance = isRTL
    ? "Ctrl+\u2192 jumps to the previous word and Ctrl+\u2190 moves to the next."
    : "Ctrl+\u2190 jumps to the previous word and Ctrl+\u2192 moves to the next.";
  const directionalNote = showDirectionalNote ? (
    <div
      className="mt-3 space-y-1 rounded bg-gray-700/60 p-3 text-sm"
      role="note"
    >
      <p className="font-semibold">
        {isRTL ? "RTL keyboard tips" : "Keyboard tips"}
      </p>
      <p>
        <strong>Arrow keys:</strong> {arrowGuidance}
      </p>
      <p>
        <strong>Word jumps:</strong> {wordJumpGuidance}
      </p>
    </div>
  ) : null;

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
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className={containerClasses}>
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
            {directionalNote}
          </>
        ) : (
          <>
            <p>
              <strong>Controls:</strong> {info.controls}
            </p>
            {directionalNote}
          </>
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
