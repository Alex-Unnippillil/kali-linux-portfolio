import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type MappingManager = {
  conflicts: Record<string, string[]>;
  exportMapping: () => string;
  importMapping: (
    payload: string,
  ) => { ok: boolean; error?: string; conflicts?: Record<string, string[]> };
};

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
  const [mapping, setKey, manager] = useInputMapping(
    gameId,
    info?.actions || {},
  ) as [
    Record<string, string>,
    (action: string, key: string) => string[] | null,
    MappingManager | undefined,
  ];
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{
    tone: "info" | "warning" | "error";
    message: string;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const conflictEntries = useMemo(
    () => Object.entries(manager?.conflicts ?? {}),
    [manager?.conflicts],
  );
  const conflictActions = useMemo(
    () =>
      Array.from(
        new Set(
          conflictEntries.flatMap(([, actions]) => actions),
        ),
      ),
    [conflictEntries],
  );

  const headingId = useMemo(() => `${gameId}-help-title`, [gameId]);
  const descriptionId = useMemo(() => `${gameId}-help-description`, [gameId]);
  const summaryId = info?.actions ? `${gameId}-shortcut-summary` : undefined;
  const conflictSummaryId =
    info?.actions && conflictEntries.length > 0
      ? `${gameId}-conflict-summary`
      : undefined;
  const summaryToken = summaryId && announcement ? summaryId : undefined;
  const describedBy = [descriptionId, summaryToken, conflictSummaryId]
    .filter(Boolean)
    .join(" ") || undefined;
  const statusId = status ? `${gameId}-help-status` : undefined;

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

  useEffect(() => {
    if (!info?.actions) {
      setAnnouncement("");
      return;
    }
    const summary = Object.entries(mapping)
      .map(([action, key]) => `${action} is ${key}`)
      .join(", ");
    setAnnouncement(
      summary ? `Available shortcuts: ${summary}.` : "",
    );
  }, [info?.actions, mapping]);

  useEffect(() => {
    setStatus(null);
  }, [gameId]);

  const handleExport = useCallback(() => {
    if (!manager) {
      setStatus({
        tone: "error",
        message: "Export is not available for this game.",
      });
      return;
    }
    try {
      const data = manager.exportMapping();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${gameId}-shortcuts.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({
        tone: "info",
        message: "Shortcut mappings exported.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: "Unable to export mappings.",
      });
    }
  }, [manager, gameId]);

  const handleImportClick = useCallback(() => {
    setStatus(null);
    fileInputRef.current?.click();
  }, []);

  const handleImportChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!manager) {
        setStatus({
          tone: "error",
          message: "Import is not available for this game.",
        });
        event.target.value = "";
        return;
      }
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = manager.importMapping(text);
        if (!result.ok) {
          setStatus({
            tone: "error",
            message: result.error ?? "Unable to import mapping.",
          });
        } else {
          const conflictSummary = result.conflicts
            ? Object.entries(result.conflicts)
                .map(([key, actions]) => `${key}: ${actions.join(", ")}`)
                .join("; ")
            : "";
          if (conflictSummary) {
            setStatus({
              tone: "warning",
              message: `Mapping imported with conflicts — ${conflictSummary}.`,
            });
          } else {
            setStatus({
              tone: "info",
              message: "Shortcut mappings imported.",
            });
          }
        }
      } catch (error) {
        setStatus({
          tone: "error",
          message: "Unable to read mapping file.",
        });
      } finally {
        event.target.value = "";
      }
    },
    [manager],
  );

  if (!info) return null;
  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-4 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={describedBy}
    >
      <div className="w-full max-w-xl rounded-lg bg-gray-800 p-4 shadow-lg focus:outline-none sm:p-6">
        <h2 id={headingId} className="text-2xl font-semibold capitalize">
          {gameId} Help
        </h2>
        <p id={descriptionId} className="mt-2 text-sm">
          <strong>Objective:</strong> {info.objective}
        </p>
        {summaryId && announcement && (
          <p id={summaryId} className="sr-only" aria-live="polite">
            {announcement}
          </p>
        )}
        {info.actions ? (
          <>
            <p className="mt-2 text-sm">
              <strong>Controls:</strong>{" "}
              {Object.entries(mapping)
                .map(([a, k]) => `${a}: ${k}`)
                .join(", ")}
            </p>
            {conflictSummaryId && (
              <div
                id={conflictSummaryId}
                className="mt-3 rounded border border-amber-500/40 bg-amber-900/30 p-3 text-xs text-amber-100 sm:text-sm"
                role="alert"
                aria-live="polite"
              >
                <p className="font-semibold">Shortcut conflicts</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {conflictEntries.map(([key, actions]) => (
                    <li key={key}>
                      <span className="font-mono">{key}</span> → {actions.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3">
              <InputRemap
                mapping={mapping}
                setKey={setKey}
                actions={info.actions}
                conflictActions={conflictActions}
              />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="rounded bg-gray-700 px-3 py-1 text-sm focus:outline-none focus:ring"
              >
                Export shortcuts
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                className="rounded bg-gray-700 px-3 py-1 text-sm focus:outline-none focus:ring"
              >
                Import shortcuts
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={handleImportChange}
              />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm">
            <strong>Controls:</strong> {info.controls}
          </p>
        )}
        {status && (
          <p
            id={statusId}
            className={`mt-3 text-sm ${
              status.tone === "error"
                ? "text-red-300"
                : status.tone === "warning"
                ? "text-amber-200"
                : "text-emerald-200"
            }`}
            role={status.tone === "info" ? "status" : "alert"}
            aria-live="assertive"
          >
            {status.message}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded bg-gray-700 px-3 py-2 text-sm font-medium focus:outline-none focus:ring"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default HelpOverlay;
