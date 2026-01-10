import React, { useRef, useEffect, useState } from "react";
import { Chess } from "chess.js";
import { suggestMoves } from "../../games/chess/engine/wasmEngine";

// 0x88 board representation utilities
const EMPTY = 0;
const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const WHITE = 1;
const BLACK = -1;

const pieceValues = {
  [PAWN]: 100,
  [KNIGHT]: 320,
  [BISHOP]: 330,
  [ROOK]: 500,
  [QUEEN]: 900,
  [KING]: 20000,
};

const pieceUnicode = {
  [PAWN]: { [WHITE]: "♙", [BLACK]: "♟" },
  [KNIGHT]: { [WHITE]: "♘", [BLACK]: "♞" },
  [BISHOP]: { [WHITE]: "♗", [BLACK]: "♝" },
  [ROOK]: { [WHITE]: "♖", [BLACK]: "♜" },
  [QUEEN]: { [WHITE]: "♕", [BLACK]: "♛" },
  [KING]: { [WHITE]: "♔", [BLACK]: "♚" },
};

// sprite images for consistent piece rendering
const spritePaths = {
  [PAWN]: { [WHITE]: "/pieces/wP.svg", [BLACK]: "/pieces/bP.svg" },
  [KNIGHT]: { [WHITE]: "/pieces/wN.svg", [BLACK]: "/pieces/bN.svg" },
  [BISHOP]: { [WHITE]: "/pieces/wB.svg", [BLACK]: "/pieces/bB.svg" },
  [ROOK]: { [WHITE]: "/pieces/wR.svg", [BLACK]: "/pieces/bR.svg" },
  [QUEEN]: { [WHITE]: "/pieces/wQ.svg", [BLACK]: "/pieces/bQ.svg" },
  [KING]: { [WHITE]: "/pieces/wK.svg", [BLACK]: "/pieces/bK.svg" },
};

const defaultMoveDuration = 260;

const defaultChessPalette = {
  boardLight: "#dee7f5",
  boardDark: "#1a2634",
  boardSheenTop: "rgba(255,255,255,0.08)",
  boardSheenBottom: "rgba(0,0,0,0.18)",
  lastMoveOutline: "rgba(255, 217, 102, 0.9)",
  selectionOutline: "rgba(102, 204, 255, 0.9)",
  moveHintOutline: "rgba(102, 204, 255, 0.7)",
  cursorOutline: "rgba(255, 255, 255, 0.6)",
  mateHint: "rgba(64, 160, 255, 0.45)",
  hoverInner: "rgba(255,255,255,0.35)",
  hoverOuter: "rgba(255,213,128,0.18)",
  hoverOutline: "rgba(255, 223, 128, 0.9)",
  pieceLight: "#111111",
  pieceDark: "#f8f8f8",
  arrow: "#ffc850",
  captureSpark: "#ffd700",
  panelSurface: "rgba(17, 27, 36, 0.85)",
  panelBorder: "rgba(94, 129, 172, 0.4)",
  timerSurface: "rgba(17, 27, 36, 0.72)",
  timerBorder: "rgba(94, 129, 172, 0.35)",
  logSurface: "rgba(17, 27, 36, 0.6)",
  logBorder: "rgba(94, 129, 172, 0.38)",
  logHighlight: "#7dd3fc",
  evalTrack: "rgba(15,23,42,0.7)",
  evalPositive: "linear-gradient(90deg,#34d399,#059669)",
  evalNegative: "linear-gradient(90deg,#f87171,#dc2626)",
  controlSurface: "rgba(17, 27, 36, 0.7)",
  controlBorder: "rgba(94, 129, 172, 0.4)",
  controlText: "#e2e8f0",
  controlHover: "rgba(30, 41, 59, 0.88)",
  focusRing: "#38bdf8",
  appSurface: "#111b24",
};

const paletteVarMap = {
  boardLight: "--chess-board-light",
  boardDark: "--chess-board-dark",
  boardSheenTop: "--chess-board-sheen-top",
  boardSheenBottom: "--chess-board-sheen-bottom",
  lastMoveOutline: "--chess-board-last-move",
  selectionOutline: "--chess-board-selection",
  moveHintOutline: "--chess-board-move-hint",
  cursorOutline: "--chess-board-cursor",
  mateHint: "--chess-board-mate",
  hoverInner: "--chess-board-hover-inner",
  hoverOuter: "--chess-board-hover-outer",
  hoverOutline: "--chess-board-hover-outline",
  pieceLight: "--chess-piece-light",
  pieceDark: "--chess-piece-dark",
  arrow: "--chess-arrow",
  captureSpark: "--chess-spark",
  panelSurface: "--chess-panel-surface",
  panelBorder: "--chess-panel-border",
  timerSurface: "--chess-timer-surface",
  timerBorder: "--chess-timer-border",
  logSurface: "--chess-log-surface",
  logBorder: "--chess-log-border",
  logHighlight: "--chess-log-highlight",
  evalTrack: "--chess-eval-track",
  evalPositive: "--chess-eval-positive-gradient",
  evalNegative: "--chess-eval-negative-gradient",
  controlSurface: "--chess-control-surface",
  controlBorder: "--chess-control-border",
  controlText: "--chess-control-text",
  controlHover: "--chess-control-hover",
  focusRing: "--chess-focus-ring",
  appSurface: "--chess-app-surface",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseRgbColor = (color) => {
  if (!color) return null;
  const value = color.trim();
  if (!value) return null;
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  }
  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length >= 3) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
  }
  return null;
};

const rgbToCss = (rgb) => `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;

const mixRgb = (a, b, amount) => ({
  r: a.r + (b.r - a.r) * amount,
  g: a.g + (b.g - a.g) * amount,
  b: a.b + (b.b - a.b) * amount,
});

const lightenRgb = (rgb, amount) => mixRgb(rgb, { r: 255, g: 255, b: 255 }, clamp(amount, 0, 1));

const blendRgb = (a, b, amount) => mixRgb(a, b, clamp(amount, 0, 1));

const withAlpha = (color, alpha) => {
  const rgb = parseRgbColor(color);
  if (!rgb) return color;
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
};

const readChessPalette = () => {
  if (typeof window === "undefined") return defaultChessPalette;
  const styles = getComputedStyle(document.documentElement);
  const palette = { ...defaultChessPalette };
  for (const [key, cssVar] of Object.entries(paletteVarMap)) {
    const value = styles.getPropertyValue(cssVar).trim();
    if (value) palette[key] = value;
  }
  return palette;
};

const palettesEqual = (a, b) => {
  for (const key of Object.keys(a)) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const parseDurationToken = (token, fallback = defaultMoveDuration) => {
  if (!token) return fallback;
  const value = token.trim();
  if (!value) return fallback;
  if (value.endsWith("ms")) {
    const num = Number.parseFloat(value.slice(0, -2));
    return Number.isFinite(num) ? num : fallback;
  }
  if (value.endsWith("s")) {
    const num = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(num) ? num * 1000 : fallback;
  }
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const SIZE = 512; // internal canvas resolution for crisp rendering
const SQ = SIZE / 8;

const files = "abcdefgh";
const sqToAlg = (sq) => {
  const file = sq & 15;
  const rank = (sq >> 4) + 1;
  return files[file] + rank;
};
const algToSq = (alg) => {
  const file = files.indexOf(alg[0]);
  const rank = parseInt(alg[1], 10) - 1;
  return rank * 16 + file;
};

// create initial board in 0x88
const createInitialBoard = () => {
  const b = new Int8Array(128);
  const place = (sq, piece) => {
    b[sq] = piece;
  };

  const backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
  for (let i = 0; i < 8; i++) {
    place(i, backRank[i]);
    place(16 + i, PAWN);
    place(96 + i, -PAWN);
    place(112 + i, -backRank[i]);
  }
  return b;
};

// move generation helpers
const knightOffsets = [-33, -31, -18, -14, 14, 18, 31, 33];
const bishopOffsets = [-17, -15, 15, 17];
const rookOffsets = [-16, -1, 1, 16];
const kingOffsets = [-17, -16, -15, -1, 1, 15, 16, 17];

const inside = (sq) => (sq & 0x88) === 0;

const isSquareAttacked = (board, sq, bySide) => {
  const enemy = bySide;

  // pawns
  if (enemy === WHITE) {
    if (inside(sq - 15) && board[sq - 15] === PAWN) return true;
    if (inside(sq - 17) && board[sq - 17] === PAWN) return true;
  } else {
    if (inside(sq + 15) && board[sq + 15] === -PAWN) return true;
    if (inside(sq + 17) && board[sq + 17] === -PAWN) return true;
  }

  // knights
  for (const o of knightOffsets) {
    const t = sq + o;
    if (inside(t)) {
      const p = board[t];
      if (p === enemy * KNIGHT) return true;
    }
  }

  // bishops/queens
  for (const o of bishopOffsets) {
    let t = sq + o;
    while (inside(t)) {
      const p = board[t];
      if (p) {
        if (p === enemy * BISHOP || p === enemy * QUEEN) return true;
        break;
      }
      t += o;
    }
  }

  // rooks/queens
  for (const o of rookOffsets) {
    let t = sq + o;
    while (inside(t)) {
      const p = board[t];
      if (p) {
        if (p === enemy * ROOK || p === enemy * QUEEN) return true;
        break;
      }
      t += o;
    }
  }

  // king
  for (const o of kingOffsets) {
    const t = sq + o;
    if (inside(t) && board[t] === enemy * KING) return true;
  }

  return false;
};

const inCheck = (board, side) => {
  for (let i = 0; i < 128; i++) {
    if (!inside(i)) continue;
    if (board[i] === side * KING) {
      return isSquareAttacked(board, i, -side);
    }
  }
  return false;
};

const generateMoves = (board, side) => {
  const moves = [];

  for (let from = 0; from < 128; from++) {
    if (!inside(from)) continue;
    const piece = board[from];
    if (piece * side <= 0) continue;

    const type = Math.abs(piece);

    if (type === PAWN) {
      const dir = side === WHITE ? 16 : -16;
      const startRank = side === WHITE ? 1 : 6;
      const rank = from >> 4;
      const one = from + dir;
      if (inside(one) && board[one] === EMPTY) {
        moves.push({ from, to: one });
        const two = from + dir * 2;
        if (rank === startRank && board[two] === EMPTY)
          moves.push({ from, to: two });
      }
      for (const cap of [dir + 1, dir - 1]) {
        const to = from + cap;
        if (inside(to) && board[to] * side < 0) moves.push({ from, to });
      }
    } else if (type === KNIGHT) {
      for (const o of knightOffsets) {
        const to = from + o;
        if (!inside(to)) continue;
        if (board[to] * side <= 0) moves.push({ from, to });
      }
    } else if (type === BISHOP || type === ROOK || type === QUEEN) {
      const dirs = [];
      if (type === BISHOP || type === QUEEN) dirs.push(...bishopOffsets);
      if (type === ROOK || type === QUEEN) dirs.push(...rookOffsets);
      for (const o of dirs) {
        let to = from + o;
        while (inside(to)) {
          const p = board[to];
          if (p === EMPTY) moves.push({ from, to });
          else {
            if (p * side < 0) moves.push({ from, to });
            break;
          }
          to += o;
        }
      }
    } else if (type === KING) {
      for (const o of kingOffsets) {
        const to = from + o;
        if (!inside(to)) continue;
        if (board[to] * side <= 0) moves.push({ from, to });
      }
    }
  }

  // filter out moves that leave king in check
  const legal = [];
  for (const m of moves) {
    const b = board.slice();
    b[m.to] = b[m.from];
    b[m.from] = EMPTY;
    if (!inCheck(b, side)) legal.push(m);
  }
  return legal;
};

const evaluate = (board) => {
  let score = 0;
  for (let i = 0; i < 128; i++) {
    if (!inside(i)) continue;
    const piece = board[i];
    if (piece > 0) score += pieceValues[piece];
    else if (piece < 0) score -= pieceValues[-piece];
  }
  return score;
};

const minimax = (board, depth, alpha, beta, side) => {
  if (depth === 0) return evaluate(board);

  const moves = generateMoves(board, side);
  if (moves.length === 0) return evaluate(board);

  if (side === WHITE) {
    let max = -Infinity;
    for (const m of moves) {
      const b = board.slice();
      b[m.to] = b[m.from];
      b[m.from] = EMPTY;
      const val = minimax(b, depth - 1, alpha, beta, -side);
      max = Math.max(max, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return max;
  }
  let min = Infinity;
  for (const m of moves) {
    const b = board.slice();
    b[m.to] = b[m.from];
    b[m.from] = EMPTY;
    const val = minimax(b, depth - 1, alpha, beta, -side);
    min = Math.min(min, val);
    beta = Math.min(beta, val);
    if (beta <= alpha) break;
  }
  return min;
};

const getBestMove = (board, side, depth) => {
  const moves = generateMoves(board, side);
  let best = null;
  let bestVal = side === WHITE ? -Infinity : Infinity;

  for (const m of moves) {
    const b = board.slice();
    b[m.to] = b[m.from];
    b[m.from] = EMPTY;
    const val = minimax(b, depth - 1, -Infinity, Infinity, -side);
    if (
      (side === WHITE && val > bestVal) ||
      (side === BLACK && val < bestVal)
    ) {
      bestVal = val;
      best = m;
    }
  }
  return best;
};

const playBeep = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.frequency.value = 400;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

const ChessGame = () => {
  const canvasRef = useRef(null);
  const boardRef = useRef(createInitialBoard());
  const chessRef = useRef(new Chess());
  const sideRef = useRef(WHITE);
  const historyRef = useRef([boardRef.current.slice()]);
  const lastMoveRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [moves, setMoves] = useState([]);
  const [status, setStatus] = useState("Your move");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [sound, setSound] = useState(true);
  const [sanLog, setSanLog] = useState([]);
  const particlesRef = useRef([]);
  const [showHints, setShowHints] = useState(false);
  const [mateSquares, setMateSquares] = useState([]);
  const [elo, setElo] = useState(() =>
    typeof window === "undefined"
      ? 1200
      : Number(localStorage.getItem("chessElo") || 1200),
  );
  const animRef = useRef(null);
  const trailsRef = useRef([]);
  const animationsRef = useRef([]);
  const moveDurationRef = useRef(defaultMoveDuration);
  const [evalScore, setEvalScore] = useState(0);
  const [displayEval, setDisplayEval] = useState(0);
  const reduceMotionRef = useRef(false);
  const spritesRef = useRef({});
  const [spritesReady, setSpritesReady] = useState(false);
  const [pieceSet, setPieceSet] = useState("sprites");
  const [analysisMoves, setAnalysisMoves] = useState([]);
  const [analysisDepth, setAnalysisDepth] = useState(2);
  const pgnInputRef = useRef(null);
  const boardWrapperRef = useRef(null);
  const [boardPixelSize, setBoardPixelSize] = useState(SIZE);
  const [hoverSquare, setHoverSquare] = useState(null);
  const [showArrows, setShowArrows] = useState(true);
  const [chessPalette, setChessPalette] = useState(defaultChessPalette);
  const [orientation, setOrientation] = useState("white");
  const clockRef = useRef({
    white: 0,
    black: 0,
    active: WHITE,
    lastTick: typeof performance !== "undefined" ? performance.now() : 0,
    resumeTarget: WHITE,
  });
  const [clockDisplay, setClockDisplay] = useState({ white: 0, black: 0 });
  const evalPercent = (1 / (1 + Math.exp(-displayEval / 200))) * 100;
  const formatClock = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const advanceClock = () => {
    if (clockRef.current.active === null) {
      clockRef.current.lastTick =
        typeof performance !== "undefined" ? performance.now() : 0;
      return;
    }
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const delta = now - clockRef.current.lastTick;
    if (delta <= 0) return;
    const key = clockRef.current.active === WHITE ? "white" : "black";
    clockRef.current[key] += delta;
    clockRef.current.lastTick = now;
    setClockDisplay({
      white: clockRef.current.white,
      black: clockRef.current.black,
    });
  };

  const startClockForSide = (side) => {
    clockRef.current.active = side;
    clockRef.current.resumeTarget = side;
    clockRef.current.lastTick =
      typeof performance !== "undefined" ? performance.now() : Date.now();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => {
      reduceMotionRef.current =
        mq.matches || document.documentElement.classList.contains("reduced-motion");
    };
    syncReducedMotion();
    mq.addEventListener("change", syncReducedMotion);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          syncReducedMotion();
          break;
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      mq.removeEventListener("change", syncReducedMotion);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof ResizeObserver === "undefined") return;
    const el = boardWrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setBoardPixelSize(Math.max(240, Math.min(width, 520)));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    startClockForSide(WHITE);
    setClockDisplay({ white: 0, black: 0 });
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!paused) {
        advanceClock();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    const imgs = {};
    let loaded = 0;
    const total = 12;
    for (const type of [PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING]) {
      imgs[type] = {};
      for (const side of [WHITE, BLACK]) {
        const img = new Image();
        img.src = spritePaths[type][side];
        img.onload = () => {
          loaded++;
          if (loaded === total) setSpritesReady(true);
        };
        imgs[type][side] = img;
      }
    }
    spritesRef.current = imgs;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateTokens = () => {
      const next = readChessPalette();
      setChessPalette((prev) => (palettesEqual(prev, next) ? prev : next));
      const styles = getComputedStyle(document.documentElement);
      const medium = styles.getPropertyValue("--motion-medium");
      moveDurationRef.current = parseDurationToken(medium, defaultMoveDuration);
    };
    updateTokens();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          updateTokens();
          break;
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    window.addEventListener("themechange", updateTokens);
    return () => {
      observer.disconnect();
      window.removeEventListener("themechange", updateTokens);
    };
  }, []);

  const updateEval = () => setEvalScore(evaluate(boardRef.current));

  useEffect(() => {
    updateEval();
  }, []);

  useEffect(() => {
    if (reduceMotionRef.current) {
      setDisplayEval(evalScore);
      return;
    }
    let frame;
    const animate = () => {
      setDisplayEval((prev) => {
        const diff = evalScore - prev;
        if (Math.abs(diff) < 1) return evalScore;
        return prev + diff * 0.1;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [evalScore]);

  useEffect(() => {
    updateMateHints();
  }, [updateMateHints]);

  const addTrail = (from, to) => {
    const fx = (from & 15) * SQ + SQ / 2;
    const fy = (7 - (from >> 4)) * SQ + SQ / 2;
    const tx = (to & 15) * SQ + SQ / 2;
    const ty = (7 - (to >> 4)) * SQ + SQ / 2;
    trailsRef.current.push({ fx, fy, tx, ty, t: performance.now() });
  };

  const startMoveAnimation = (piece, from, to) => {
    if (!piece || reduceMotionRef.current) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    animationsRef.current.push({
      piece,
      from,
      to,
      start: now,
      duration: moveDurationRef.current,
    });
  };

  const addCaptureSparks = (sq) => {
    const x = (sq & 15) * SQ + SQ / 2;
    const y = (7 - (sq >> 4)) * SQ + SQ / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 60 + Math.random() * 40;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        t: performance.now(),
      });
    }
  };

  const updateMateHints = React.useCallback(() => {
    if (!showHints) {
      setMateSquares([]);
      return;
    }
    const game = chessRef.current;
    const moves = game.moves({ verbose: true });
    const mates = [];
    for (const m of moves) {
      const clone = new Chess(game.fen());
      clone.move(m);
      if (clone.isCheckmate()) mates.push(algToSq(m.to));
    }
    setMateSquares(mates);
  }, [showHints]);

  const runAnalysis = () => {
    const suggestions = suggestMoves(chessRef.current.fen(), analysisDepth);
    setAnalysisMoves(suggestions);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const lightRgb =
      parseRgbColor(chessPalette.boardLight) ?? parseRgbColor(defaultChessPalette.boardLight);
    const darkRgb =
      parseRgbColor(chessPalette.boardDark) ?? parseRgbColor(defaultChessPalette.boardDark);
    const render = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const activeAnimations = [];
      animationsRef.current = animationsRef.current.filter((anim) => {
        const duration = anim.duration || 260;
        const elapsed = now - anim.start;
        const progress = reduceMotionRef.current
          ? 1
          : Math.min(1, elapsed / duration);
        if (progress >= 1) {
          return false;
        }
        anim.progress = progress;
        activeAnimations.push(anim);
        return true;
      });
      const suppressedSquares = new Set(
        activeAnimations.map((anim) => anim.to),
      );

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const x = f * SQ;
          const y = (7 - r) * SQ;
          const isLight = (r + f) % 2 === 0;
          const dx = f - 3.5;
          const dy = r - 3.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ambient = Math.max(0, 1 - dist / 4.2);
          if (isLight) {
            const tone = lightenRgb(lightRgb, ambient * 0.2);
            ctx.fillStyle = rgbToCss(tone);
          } else {
            const tone = blendRgb(darkRgb, lightRgb, ambient * 0.18);
            ctx.fillStyle = rgbToCss(tone);
          }
          ctx.fillRect(x, y, SQ, SQ);

          const sheen = ctx.createLinearGradient(x, y, x, y + SQ);
          sheen.addColorStop(0, chessPalette.boardSheenTop);
          sheen.addColorStop(1, chessPalette.boardSheenBottom);
          ctx.fillStyle = sheen;
          ctx.fillRect(x, y, SQ, SQ);

          const sq = r * 16 + f;
          if (
            lastMoveRef.current &&
            (sq === lastMoveRef.current.from || sq === lastMoveRef.current.to)
          ) {
            ctx.strokeStyle = chessPalette.lastMoveOutline;
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y + 1.5, SQ - 3, SQ - 3);
          }

          if (selected === sq) {
            ctx.strokeStyle = chessPalette.selectionOutline;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 2, y + 2, SQ - 4, SQ - 4);
          } else {
            const move = moves.find((m) => m.to === sq);
            if (move) {
              ctx.strokeStyle = chessPalette.moveHintOutline;
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 4, y + 4, SQ - 8, SQ - 8);
            }
          }

          if (cursor === sq) {
            ctx.strokeStyle = chessPalette.cursorOutline;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 3, y + 3, SQ - 6, SQ - 6);
          }

          if (mateSquares.includes(sq)) {
            ctx.beginPath();
            ctx.arc(x + SQ / 2, y + SQ / 2, SQ / 6, 0, Math.PI * 2);
            ctx.fillStyle = chessPalette.mateHint;
            ctx.fill();
          }

          if (hoverSquare === sq && selected !== sq) {
            const highlight = ctx.createRadialGradient(
              x + SQ / 2,
              y + SQ / 2,
              SQ / 8,
              x + SQ / 2,
              y + SQ / 2,
              SQ / 2,
            );
            highlight.addColorStop(0, chessPalette.hoverInner);
            highlight.addColorStop(1, chessPalette.hoverOuter);
            ctx.fillStyle = highlight;
            ctx.fillRect(x, y, SQ, SQ);
            ctx.strokeStyle = chessPalette.hoverOutline;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, SQ - 2, SQ - 2);
          }

          const piece = boardRef.current[sq];
          if (piece && !suppressedSquares.has(sq)) {
            const img =
              spritesRef.current[Math.abs(piece)]?.[piece > 0 ? WHITE : BLACK];
            if (pieceSet === "sprites" && img && spritesReady) {
              ctx.save();
              ctx.shadowColor = "rgba(0,0,0,0.35)";
              ctx.shadowBlur = 12;
              ctx.drawImage(img, x + 4, y + 4, SQ - 8, SQ - 8);
              ctx.restore();
            } else {
              ctx.font = `${SQ - 10}px serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle =
                piece > 0 ? chessPalette.pieceLight : chessPalette.pieceDark;
              ctx.fillText(
                pieceUnicode[Math.abs(piece)][piece > 0 ? WHITE : BLACK],
                x + SQ / 2,
                y + SQ / 2,
              );
            }
          }
        }
      }

      if (showArrows) {
        trailsRef.current = trailsRef.current.filter((t) => now - t.t < 1000);
        for (const t of trailsRef.current) {
          const age = (now - t.t) / 1000;
          const alpha = reduceMotionRef.current ? 0.5 : Math.max(0, 1 - age);
          ctx.strokeStyle = withAlpha(chessPalette.arrow, alpha);
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(t.fx, t.fy);
          ctx.lineTo(t.tx, t.ty);
          ctx.stroke();
          const angle = Math.atan2(t.ty - t.fy, t.tx - t.fx);
          const head = 12;
          ctx.beginPath();
          ctx.moveTo(t.tx, t.ty);
          ctx.lineTo(
            t.tx - head * Math.cos(angle - Math.PI / 6),
            t.ty - head * Math.sin(angle - Math.PI / 6),
          );
          ctx.lineTo(
            t.tx - head * Math.cos(angle + Math.PI / 6),
            t.ty - head * Math.sin(angle + Math.PI / 6),
          );
          ctx.closePath();
          ctx.fillStyle = withAlpha(chessPalette.arrow, alpha);
          ctx.fill();
        }
      } else {
        trailsRef.current = [];
      }

      particlesRef.current = particlesRef.current.filter(
        (p) => now - p.t < 500,
      );
      for (const p of particlesRef.current) {
        const age = (now - p.t) / 1000;
        const px = p.x + p.vx * age;
        const py = p.y + p.vy * age;
        const alpha = reduceMotionRef.current ? 0.7 : Math.max(0, 1 - age * 2);
        ctx.fillStyle = withAlpha(chessPalette.captureSpark, alpha);
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const anim of activeAnimations) {
        const progress = anim.progress ?? 0;
        const eased = 1 - Math.pow(1 - progress, 3);
        const fromFile = anim.from & 15;
        const fromRank = anim.from >> 4;
        const toFile = anim.to & 15;
        const toRank = anim.to >> 4;
        const fromX = fromFile * SQ;
        const fromY = (7 - fromRank) * SQ;
        const toX = toFile * SQ;
        const toY = (7 - toRank) * SQ;
        const drawX = fromX + (toX - fromX) * eased;
        const drawY = fromY + (toY - fromY) * eased;
        const img =
          spritesRef.current[Math.abs(anim.piece)]?.[
            anim.piece > 0 ? WHITE : BLACK
          ];
        if (pieceSet === "sprites" && img && spritesReady) {
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 14;
          ctx.globalAlpha = 0.9;
          ctx.drawImage(img, drawX + 4, drawY + 4, SQ - 8, SQ - 8);
          ctx.restore();
        } else {
          ctx.font = `${SQ - 10}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle =
            anim.piece > 0 ? chessPalette.pieceLight : chessPalette.pieceDark;
          ctx.fillText(
            pieceUnicode[Math.abs(anim.piece)][
              anim.piece > 0 ? WHITE : BLACK
            ],
            drawX + SQ / 2,
            drawY + SQ / 2,
          );
        }
      }

      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [
    selected,
    moves,
    mateSquares,
    cursor,
    spritesReady,
    pieceSet,
    hoverSquare,
    showArrows,
    chessPalette,
  ]);

  const endGame = (result) => {
    // result: 1 win, 0 draw, -1 loss
    const score = result === 1 ? 1 : result === 0 ? 0.5 : 0;
    const opp = 1200;
    const expected = 1 / (1 + 10 ** ((opp - elo) / 400));
    const k = 32;
    const newElo = Math.round(elo + k * (score - expected));
    setElo(newElo);
    if (typeof window !== "undefined")
      localStorage.setItem("chessElo", String(newElo));
  };

  const checkGameState = (defaultStatus, skipElo = false) => {
    const game = chessRef.current;
    if (game.isCheckmate()) {
      if (game.turn() === "w") {
        setStatus("Checkmate! You lose");
        if (!skipElo) endGame(-1);
      } else {
        setStatus("Checkmate! You win");
        if (!skipElo) endGame(1);
      }
      return true;
    }
    if (game.isDraw()) {
      setStatus("Draw");
      if (!skipElo) endGame(0);
      return true;
    }
    if (game.isCheck()) {
      setStatus("Check!");
    } else if (defaultStatus) {
      setStatus(defaultStatus);
    }
    return false;
  };

  const aiMove = () => {
    if (pausedRef.current) return;
    const move = getBestMove(boardRef.current, sideRef.current, 2);
    if (move) {
      const movingPiece = boardRef.current[move.from];
      const capture = boardRef.current[move.to] !== EMPTY;
      const res = chessRef.current.move({
        from: sqToAlg(move.from),
        to: sqToAlg(move.to),
        promotion: "q",
      });
      if (!res) return;
      startMoveAnimation(movingPiece, move.from, move.to);
      boardRef.current[move.to] = movingPiece;
      boardRef.current[move.from] = EMPTY;
      addTrail(move.from, move.to);
      if (capture) addCaptureSparks(move.to);
      historyRef.current.push(boardRef.current.slice());
      setSanLog((l) => [...l, res.san]);
      if (sound) playBeep();
      setSelected(null);
      setMoves([]);
      lastMoveRef.current = { from: move.from, to: move.to };
      advanceClock();
      sideRef.current = -sideRef.current;
      if (!pausedRef.current) {
        startClockForSide(sideRef.current);
      } else {
        clockRef.current.resumeTarget = sideRef.current;
        clockRef.current.active = null;
      }
      updateEval();
      updateMateHints();
      checkGameState("Your move");
    }
  };

  const handleSquare = (sq) => {
    if (paused) return;
    setCursor(sq);
    const side = sideRef.current;

    if (selected !== null) {
      const legal = moves.find((m) => m.to === sq);
      if (legal) {
        const movingPiece = boardRef.current[legal.from];
        const res = chessRef.current.move({
          from: sqToAlg(legal.from),
          to: sqToAlg(legal.to),
          promotion: "q",
        });
        if (res) {
          const capture = boardRef.current[legal.to] !== EMPTY;
          startMoveAnimation(movingPiece, legal.from, legal.to);
          boardRef.current[legal.to] = movingPiece;
          boardRef.current[legal.from] = EMPTY;
          addTrail(legal.from, legal.to);
          if (capture) addCaptureSparks(legal.to);
          if (sound) playBeep();
          historyRef.current.push(boardRef.current.slice());
          setSanLog((l) => [...l, res.san]);
          advanceClock();
          sideRef.current = -side;
          if (!pausedRef.current) {
            startClockForSide(sideRef.current);
          } else {
            clockRef.current.resumeTarget = sideRef.current;
            clockRef.current.active = null;
          }
          setSelected(null);
          setMoves([]);
          lastMoveRef.current = { from: legal.from, to: legal.to };
          updateEval();
          updateMateHints();
          if (!checkGameState("AI thinking...")) {
            setTimeout(aiMove, 200);
          }
          return;
        }
      }
      setSelected(null);
      setMoves([]);
    } else if (boardRef.current[sq] * side > 0) {
      setSelected(sq);
      const legals = chessRef.current
        .moves({ square: sqToAlg(sq), verbose: true })
        .map((m) => ({
          from: algToSq(m.from),
          to: algToSq(m.to),
          capture: !!m.captured,
        }));
      setMoves(legals);
    }
  };

  const getSquareFromEvent = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!width || !height) return null;
    let file = Math.floor(((event.clientX - rect.left) / width) * 8);
    let rank = 7 - Math.floor(((event.clientY - rect.top) / height) * 8);
    if (orientation === "black") {
      file = 7 - file;
      rank = 7 - rank;
    }
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return rank * 16 + file;
  };

  const handleClick = (e) => {
    const sq = getSquareFromEvent(e);
    if (sq !== null) handleSquare(sq);
  };

  const handleMouseMove = (e) => {
    const sq = getSquareFromEvent(e);
    if (sq !== null) setHoverSquare(sq);
    else setHoverSquare(null);
  };

  const handleMouseLeave = () => setHoverSquare(null);

  const handleKey = (e) => {
    if (paused) return;
    let next = cursor;
    const forward = orientation === "white" ? 16 : -16;
    const right = orientation === "white" ? 1 : -1;
    if (e.key === "ArrowUp") next += forward;
    else if (e.key === "ArrowDown") next -= forward;
    else if (e.key === "ArrowLeft") next -= right;
    else if (e.key === "ArrowRight") next += right;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSquare(cursor);
      return;
    }
    if (next !== cursor && inside(next)) {
      e.preventDefault();
      setCursor(next);
    }
  };

  const reset = () => {
    boardRef.current = createInitialBoard();
    chessRef.current.reset();
    sideRef.current = WHITE;
    historyRef.current = [boardRef.current.slice()];
    setSelected(null);
    setCursor(0);
    setMoves([]);
    trailsRef.current = [];
    particlesRef.current = [];
    animationsRef.current = [];
    setHoverSquare(null);
    setSanLog([]);
    updateEval();
    updateMateHints();
    setPaused(false);
    setStatus("Your move");
    lastMoveRef.current = null;
    clockRef.current = {
      white: 0,
      black: 0,
      active: WHITE,
      lastTick: typeof performance !== "undefined" ? performance.now() : Date.now(),
      resumeTarget: WHITE,
    };
    setClockDisplay({ white: 0, black: 0 });
    startClockForSide(WHITE);
  };

  const togglePause = () =>
    setPaused((p) => {
      if (!p) {
        advanceClock();
        clockRef.current.resumeTarget =
          clockRef.current.active ?? sideRef.current;
        clockRef.current.active = null;
      } else {
        const resumeSide =
          clockRef.current.resumeTarget ?? sideRef.current;
        startClockForSide(resumeSide);
      }
      return !p;
    });
  const toggleSound = () => setSound((s) => !s);
  const toggleHints = () => setShowHints((s) => !s);
  const togglePieces = () =>
    setPieceSet((p) => (p === "sprites" ? "unicode" : "sprites"));
  const toggleArrows = () => setShowArrows((s) => !s);
  const flipBoard = () => {
    setHoverSquare(null);
    setOrientation((o) => (o === "white" ? "black" : "white"));
  };
  const undoMove = () => {
    let undone = 0;
    if (historyRef.current.length <= 1) return;
    if (chessRef.current.history().length > 0) {
      chessRef.current.undo();
      historyRef.current.pop();
      undone++;
    }
    if (
      chessRef.current.turn() === "b" &&
      chessRef.current.history().length > 0
    ) {
      chessRef.current.undo();
      historyRef.current.pop();
      undone++;
    }
    boardRef.current =
      historyRef.current[historyRef.current.length - 1].slice();
    sideRef.current = chessRef.current.turn() === "w" ? WHITE : BLACK;
    trailsRef.current = [];
    particlesRef.current = [];
    setSelected(null);
    setMoves([]);
    setSanLog((l) => l.slice(0, -undone));
    updateEval();
    updateMateHints();
    lastMoveRef.current = null;
    setStatus("Your move");
    clockRef.current.white = 0;
    clockRef.current.black = 0;
    clockRef.current.resumeTarget = sideRef.current;
    clockRef.current.lastTick =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!pausedRef.current) {
      startClockForSide(sideRef.current);
    }
    setClockDisplay({ white: clockRef.current.white, black: clockRef.current.black });
  };

  const copyMoves = () => {
    navigator.clipboard?.writeText(chessRef.current.pgn());
  };

  const loadPGNString = (pgn) => {
    if (!pgn) return;
    reset();
    if (!chessRef.current.load_pgn(pgn)) {
      alert("Invalid PGN");
      reset();
      return;
    }
    const moves = chessRef.current.history({ verbose: true });
    chessRef.current.reset();
    boardRef.current = createInitialBoard();
    historyRef.current = [boardRef.current.slice()];
    setSanLog([]);
    sideRef.current = WHITE;
    setPaused(true);
    clockRef.current.active = null;
    clockRef.current.white = 0;
    clockRef.current.black = 0;
    clockRef.current.resumeTarget = WHITE;
    setClockDisplay({ white: 0, black: 0 });
    setStatus("Replaying PGN...");
    let i = 0;
    const playNext = () => {
      if (i >= moves.length) {
        setPaused(false);
        startClockForSide(sideRef.current);
        checkGameState("Your move", true);
        return;
      }
      const m = moves[i++];
      const res = chessRef.current.move(m);
      const from = algToSq(m.from);
      const to = algToSq(m.to);
      const capture = boardRef.current[to] !== EMPTY;
      const movingPiece = boardRef.current[from];
      startMoveAnimation(movingPiece, from, to);
      boardRef.current[to] = movingPiece;
      boardRef.current[from] = EMPTY;
      addTrail(from, to);
      if (capture) addCaptureSparks(to);
      lastMoveRef.current = { from, to };
      historyRef.current.push(boardRef.current.slice());
      setSanLog((l) => [...l, res.san]);
      sideRef.current = chessRef.current.turn() === "w" ? WHITE : BLACK;
      updateEval();
      updateMateHints();
      if (sound) playBeep();
      checkGameState(undefined, true);
      setTimeout(playNext, 500);
    };
    playNext();
  };

  const handlePGNImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadPGNString(reader.result);
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadPGN = () => {
    pgnInputRef.current?.click();
  };

  const moveLines = [];
  for (let i = 0; i < sanLog.length; i += 2) {
    moveLines.push(
      `${i / 2 + 1}. ${sanLog[i]}${sanLog[i + 1] ? " " + sanLog[i + 1] : ""}`,
    );
  }

  const statusTone = status.includes("Checkmate")
    ? "bg-[color:color-mix(in_srgb,var(--game-color-danger)_78%,transparent)] text-[color:var(--color-text)]"
    : status.includes("Check")
      ? "bg-[color:color-mix(in_srgb,var(--game-color-warning)_72%,var(--chess-panel-surface))] text-[color:var(--color-bg)]"
      : "bg-[color:var(--chess-panel-surface)] text-[color:var(--color-text)]";
  const whiteClock = formatClock(clockDisplay.white);
  const blackClock = formatClock(clockDisplay.black);
  const orientationLabel = orientation === "white" ? "White" : "Black";
  const formattedEval = (evalScore / 100).toFixed(2);
  const engineSuggestions = analysisMoves.slice(0, 5);
  const buttonClass =
    "rounded-full border border-[color:var(--chess-control-border)] bg-[color:var(--chess-control-surface)] px-3 py-1.5 font-semibold uppercase tracking-wide text-[color:var(--chess-control-text)] transition-colors duration-150 hover:bg-[color:var(--chess-control-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chess-focus-ring)]";

  return (
    <div className="h-full w-full select-none bg-[color:var(--chess-app-surface)] p-2 text-[color:var(--color-text)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col items-center gap-4">
          <div ref={boardWrapperRef} className="w-full">
            <div className="mx-auto flex justify-center">
              <canvas
                ref={canvasRef}
                width={SIZE}
                height={SIZE}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onKeyDown={handleKey}
                tabIndex={0}
                aria-label="Chess board"
                className="rounded-2xl border border-[color:var(--chess-panel-border)] bg-[color:var(--chess-panel-surface)] shadow-[0_30px_60px_rgba(0,0,0,0.45)] outline-none transition-transform duration-500 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--chess-focus-ring)]"
                style={{
                  width: boardPixelSize,
                  height: boardPixelSize,
                  transform:
                    orientation === "white" ? "rotate(0deg)" : "rotate(180deg)",
                }}
              />
            </div>
          </div>
          <input
            type="file"
            accept=".pgn"
            ref={pgnInputRef}
            onChange={handlePGNImport}
            className="hidden"
            aria-label="PGN file input"
          />
          <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
            <button className={buttonClass} onClick={reset}>
              Reset
            </button>
            <button className={buttonClass} onClick={undoMove}>
              Undo
            </button>
            <button className={buttonClass} onClick={togglePause}>
              {paused ? "Resume" : "Pause"}
            </button>
            <button className={buttonClass} onClick={toggleSound}>
              {sound ? "Sound On" : "Sound Off"}
            </button>
          </div>
        </div>
        <aside className="w-full flex-shrink-0 rounded-2xl border border-[color:var(--chess-panel-border)] bg-[color:var(--chess-panel-surface)] p-5 text-[color:var(--color-text)] shadow-[0_20px_45px_rgba(0,0,0,0.55)] backdrop-blur-md lg:w-80">
          <div className="space-y-6">
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold uppercase tracking-wide text-[color:var(--color-text)]">
                <span aria-hidden>♟️</span>
                <span>Game State</span>
              </h2>
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-semibold shadow-inner ${statusTone}`}
                aria-live="polite"
              >
                {status}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[color:var(--color-text)]">
                <div className="rounded-xl border border-[color:var(--chess-timer-border)] bg-[color:var(--chess-timer-surface)] p-3 shadow-inner">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                    <span aria-hidden>🕊️</span>
                    <span>White</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono text-[color:var(--color-text)]">
                    {whiteClock}
                  </div>
                </div>
                <div className="rounded-xl border border-[color:var(--chess-timer-border)] bg-[color:var(--chess-timer-surface)] p-3 shadow-inner">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                    <span aria-hidden>🗡️</span>
                    <span>Black</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono text-[color:var(--color-text)]">
                    {blackClock}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                Orientation: <span className="font-semibold text-[color:var(--color-text)]">{orientationLabel}</span>
              </div>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--color-text)]">
                <span aria-hidden>📈</span>
                <span>Evaluation</span>
              </h2>
              <div
                className="mt-3 h-3 w-full overflow-hidden rounded-full"
                role="progressbar"
                aria-label="Evaluation score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(evalPercent.toFixed(0))}
                style={{ background: chessPalette.evalTrack }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${evalPercent}%`,
                    background:
                      displayEval >= 0
                        ? chessPalette.evalPositive
                        : chessPalette.evalNegative,
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)]">
                <span>Score {formattedEval}</span>
                <span>ELO {elo}</span>
              </div>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--color-text)]">
                <span aria-hidden>📋</span>
                <span>Move List</span>
              </h2>
              <div
                className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[color:var(--chess-log-border)] bg-[color:var(--chess-log-surface)] p-3 text-sm leading-relaxed shadow-inner"
                aria-label="Move list"
              >
                {moveLines.length > 0 ? (
                  <ol className="space-y-1">
                    {moveLines.map((line, idx) => (
                      <li
                        key={idx}
                        className="font-mono"
                        style={
                          idx === moveLines.length - 1
                            ? { color: chessPalette.logHighlight }
                            : undefined
                        }
                      >
                        {line}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs italic text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                    No moves yet — make your first move to begin the story.
                  </p>
                )}
              </div>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--color-text)]">
                <span aria-hidden>💡</span>
                <span>Engine Tips</span>
              </h2>
              <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                Use the embedded engine for on-demand guidance. Higher depths explore more replies.
              </p>
              <label
                className="mt-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]"
                htmlFor="chess-depth"
              >
                <span>Depth</span>
                <select
                  id="chess-depth"
                  className="rounded-lg border border-[color:var(--chess-control-border)] bg-[color:var(--chess-control-surface)] px-2 py-1 text-sm text-[color:var(--chess-control-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chess-focus-ring)]"
                  value={analysisDepth}
                  onChange={(e) => setAnalysisDepth(parseInt(e.target.value, 10))}
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <button className={buttonClass} onClick={runAnalysis}>
                  Analyze
                </button>
                <button className={buttonClass} onClick={copyMoves}>
                  Copy PGN
                </button>
                <button className={buttonClass} onClick={loadPGN}>
                  Load PGN
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--color-text)]" aria-live="polite">
                {engineSuggestions.length > 0 ? (
                  engineSuggestions.map((m, idx) => (
                    <li
                      key={`${m.san}-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-[color:var(--chess-log-border)] bg-[color:var(--chess-log-surface)] px-3 py-2 shadow-inner"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          style={{ color: chessPalette.logHighlight }}
                        >
                          ⚡
                        </span>
                        <span>{m.san}</span>
                      </span>
                      <span className="font-mono text-xs text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)]">
                        {(m.evaluation / 100).toFixed(2)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs italic text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                    Run analysis to reveal tactical ideas.
                  </li>
                )}
              </ul>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--color-text)]">
                <span aria-hidden>⚙️</span>
                <span>Options</span>
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <button className={buttonClass} onClick={flipBoard}>
                  Flip to {orientation === "white" ? "Black" : "White"} view
                </button>
                <button className={buttonClass} onClick={toggleArrows}>
                  {showArrows ? "Hide Arrows" : "Show Arrows"}
                </button>
                <button className={buttonClass} onClick={togglePieces}>
                  {pieceSet === "sprites" ? "Use Unicode" : "Use SVG Pieces"}
                </button>
                <button className={buttonClass} onClick={toggleHints}>
                  {showHints ? "Hide Mate-in-1" : "Show Mate-in-1"}
                </button>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ChessGame;
