import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  parseOpeningPgn,
  parsePuzzlePgn,
} from "../../games/chess/pgn";
import { createEngineRequestTracker } from "../../games/chess/engine/engineProtocol";

const WHITE = 1;
const BLACK = -1;

const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const SIZE = 512;

const pieceUnicode = {
  1: "\u2659",
  2: "\u2658",
  3: "\u2657",
  4: "\u2656",
  5: "\u2655",
  6: "\u2654",
  "-1": "\u265F",
  "-2": "\u265E",
  "-3": "\u265D",
  "-4": "\u265C",
  "-5": "\u265B",
  "-6": "\u265A",
};

const spritePaths = {
  1: "/pieces/wP.svg",
  2: "/pieces/wN.svg",
  3: "/pieces/wB.svg",
  4: "/pieces/wR.svg",
  5: "/pieces/wQ.svg",
  6: "/pieces/wK.svg",
  "-1": "/pieces/bP.svg",
  "-2": "/pieces/bN.svg",
  "-3": "/pieces/bB.svg",
  "-4": "/pieces/bR.svg",
  "-5": "/pieces/bQ.svg",
  "-6": "/pieces/bK.svg",
};

const boardTexturePath = "/chess/board-texture.svg";

const pieceValues = {
  [PAWN]: 100,
  [KNIGHT]: 320,
  [BISHOP]: 330,
  [ROOK]: 500,
  [QUEEN]: 900,
  [KING]: 20000,
};

const files = "abcdefgh";
const sqToAlg = (sq) => {
  const file = sq & 7;
  const rank = (sq >> 4) + 1;
  return files[file] + rank;
};

const algToSq = (alg) => {
  if (!alg || alg.length < 2) return null;
  const file = files.indexOf(alg[0]);
  const rank = Number.parseInt(alg.slice(1), 10) - 1;
  if (file < 0 || rank < 0 || rank > 7) return null;
  return rank * 16 + file;
};

const inside = (sq) => (sq & 0x88) === 0;

const createInitialBoard = () => {
  const b = new Int8Array(128);
  const backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
  for (let f = 0; f < 8; f++) {
    b[f] = WHITE * backRank[f];
    b[16 + f] = WHITE * PAWN;
    b[6 * 16 + f] = BLACK * PAWN;
    b[7 * 16 + f] = BLACK * backRank[f];
  }
  return b;
};

const evaluateMaterial = (board) => {
  let score = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (!inside(sq)) {
      sq += 7;
      continue;
    }
    const piece = board[sq];
    if (!piece) continue;
    const abs = Math.abs(piece);
    const val = pieceValues[abs] || 0;
    score += piece > 0 ? val : -val;
  }
  return score;
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const formatClock = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const STORAGE_KEY = "chess-session-v1";

const readStoredSession = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const safeLoadPgn = (game, pgn) => {
  if (!game || !pgn) return false;
  if (typeof game.load_pgn === "function") return game.load_pgn(pgn);
  if (typeof game.loadPgn === "function") return game.loadPgn(pgn);
  return false;
};

const safeLoadFen = (game, fen) => {
  if (!game || !fen) return false;
  if (typeof game.load === "function") return game.load(fen);
  return false;
};

const ChessGame = () => {
  const storedSession = useMemo(() => readStoredSession(), []);
  const storedSettings = useMemo(
    () => storedSession?.settings ?? {},
    [storedSession],
  );
  const storedGame = useMemo(() => storedSession?.game ?? {}, [storedSession]);
  const skipInitialResetRef = useRef(Boolean(storedGame?.pgn));
  const hasRestoredRef = useRef(false);
  const aiMoveRef = useRef(null);
  const engineWorkerRef = useRef(null);
  const renderStateRef = useRef({ raf: null, needsRender: false });
  const renderFrameRef = useRef(null);
  const boardCacheRef = useRef({
    canvas: null,
    size: 0,
    dpr: 1,
    textureReady: false,
  });
  const boardTextureRef = useRef(null);
  const squareSizeRef = useRef(SIZE / 8);
  const dprRef = useRef(1);
  const modeRef = useRef("play");
  const skipModeResetRef = useRef(false);
  const aiTrackerRef = useRef(createEngineRequestTracker());
  const analysisTrackerRef = useRef(createEngineRequestTracker());
  const engineCallbacksRef = useRef(new Map());
  const aiThinkingRef = useRef(false);

  const canvasRef = useRef(null);
  const boardWrapperRef = useRef(null);
  const pgnInputRef = useRef(null);

  const chessRef = useRef(new Chess());
  const boardRef = useRef(createInitialBoard());
  const sideRef = useRef(WHITE);
  const playerSideRef = useRef(WHITE);
  const aiDepthRef = useRef(2);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);

  const aiTimeoutRef = useRef(null);
  const replayTimeoutRef = useRef(null);
  const replayTokenRef = useRef(0);

  const audioCtxRef = useRef(null);
  const spritesRef = useRef({});

  const trailsRef = useRef([]);
  const particlesRef = useRef([]);
  const animationsRef = useRef([]);
  const lastMoveRef = useRef(null);

  const clockRef = useRef({
    white: 0,
    black: 0,
    active: WHITE,
    lastTick: typeof performance !== "undefined" ? performance.now() : Date.now(),
    resumeTarget: WHITE,
  });

  const [selected, setSelected] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [moves, setMoves] = useState([]);
  const [status, setStatus] = useState("Your move");
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [sound, setSound] = useState(storedSettings.sound ?? true);
  const [showHints, setShowHints] = useState(storedSettings.showHints ?? false);
  const [mateSquares, setMateSquares] = useState([]);
  const [showArrows, setShowArrows] = useState(storedSettings.showArrows ?? true);
  const [showCoordinates, setShowCoordinates] = useState(
    storedSettings.showCoordinates ?? true,
  );
  const [orientation, setOrientation] = useState(
    storedSettings.orientation ?? "white",
  );
  const [pieceSet, setPieceSet] = useState(storedSettings.pieceSet ?? "sprites");
  const [spritesReady, setSpritesReady] = useState(false);
  const [boardTextureReady, setBoardTextureReady] = useState(false);
  const [sanLog, setSanLog] = useState([]);
  const [analysisMoves, setAnalysisMoves] = useState([]);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisDepth, setAnalysisDepth] = useState(
    storedSettings.analysisDepth ?? 2,
  );
  const [aiDepth, setAiDepth] = useState(storedSettings.aiDepth ?? 2);
  const [aiThinking, setAiThinking] = useState(false);
  const [playerSide, setPlayerSide] = useState(
    storedSettings.playerSide ?? WHITE,
  );
  const [boardPixelSize, setBoardPixelSize] = useState(SIZE);
  const [hoverSquare, setHoverSquare] = useState(null);
  const [checkSquare, setCheckSquare] = useState(null);
  const [turnLabel, setTurnLabel] = useState("White");
  const [clockDisplay, setClockDisplay] = useState({ white: 0, black: 0 });
  const [evalScore, setEvalScore] = useState(0);
  const [displayEval, setDisplayEval] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pgnError, setPgnError] = useState("");
  const [mode, setMode] = useState("play");
  const [puzzles, setPuzzles] = useState([]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [puzzleStep, setPuzzleStep] = useState(0);
  const [puzzleStatus, setPuzzleStatus] = useState("");
  const [puzzleSolutionShown, setPuzzleSolutionShown] = useState(false);
  const [puzzleStreak, setPuzzleStreak] = useState(() =>
    typeof window !== "undefined"
      ? Number(localStorage.getItem("chessPuzzleStreak") || 0)
      : 0,
  );
  const [openings, setOpenings] = useState([]);
  const [openingIndex, setOpeningIndex] = useState(0);
  const [openingStep, setOpeningStep] = useState(0);
  const [openingFeedback, setOpeningFeedback] = useState("");
  const [openingOutOfLine, setOpeningOutOfLine] = useState(false);
  const [promotionPrompt, setPromotionPrompt] = useState(null);
  const [promotionIndex, setPromotionIndex] = useState(0);
  const [elo, setElo] = useState(() =>
    typeof window !== "undefined"
      ? Number(localStorage.getItem("chessElo") || 1200)
      : 1200,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [updateCheckHighlight]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [puzzleRes, openingRes] = await Promise.all([
          fetch("/chess/puzzles.pgn"),
          fetch("/chess/openings.pgn"),
        ]);
        const [puzzleText, openingText] = await Promise.all([
          puzzleRes.ok ? puzzleRes.text() : "",
          openingRes.ok ? openingRes.text() : "",
        ]);
        if (!active) return;
        setPuzzles(parsePuzzlePgn(puzzleText));
        setOpenings(parseOpeningPgn(openingText));
      } catch {
        if (!active) return;
        setPuzzles([]);
        setOpenings([]);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [updateCheckHighlight]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    playerSideRef.current = playerSide;
  }, [playerSide]);

  useEffect(() => {
    aiDepthRef.current = aiDepth;
  }, [aiDepth]);

  useEffect(() => {
    aiThinkingRef.current = aiThinking;
  }, [aiThinking]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (mode === "play") {
      if (skipModeResetRef.current) {
        skipModeResetRef.current = false;
        return;
      }
      setPuzzleStatus("");
      setOpeningFeedback("");
      setOpeningOutOfLine(false);
      setPuzzleStep(0);
      setOpeningStep(0);
      resetGame({ autoplayAi: true });
      return;
    }
    if (mode === "puzzle" && puzzles.length > 0) {
      loadPuzzle(puzzleIndex);
    }
    if (mode === "opening" && openings.length > 0) {
      loadOpening(openingIndex);
    }
  }, [
    loadOpening,
    loadPuzzle,
    mode,
    openingIndex,
    openings.length,
    puzzleIndex,
    puzzles.length,
    resetGame,
  ]);

  const stopAi = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    setAiThinking(false);
  }, []);

  const requestRender = useCallback(() => {
    const state = renderStateRef.current;
    state.needsRender = true;
    if (!state.raf && typeof requestAnimationFrame !== "undefined") {
      state.raf = requestAnimationFrame(() => {
        state.raf = null;
        renderFrameRef.current?.();
      });
    }
  }, []);

  const cancelReplay = useCallback(() => {
    replayTokenRef.current += 1;
    if (replayTimeoutRef.current) {
      clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = null;
    }
  }, []);

  const playBeep = useCallback(() => {
    if (!sound || typeof window === "undefined") return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // ignore audio errors
    }
  }, [sound]);

  const syncBoardFromChess = useCallback(() => {
    const game = chessRef.current;
    const grid = game.board();
    const map = { p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING };
    const next = new Int8Array(128);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = grid[row][col];
        if (!piece) continue;
        const type = map[piece.type];
        const sign = piece.color === "w" ? WHITE : BLACK;
        const rank = 7 - row;
        next[rank * 16 + col] = sign * type;
      }
    }

    boardRef.current = next;
    sideRef.current = game.turn() === "w" ? WHITE : BLACK;
    setTurnLabel(game.turn() === "w" ? "White" : "Black");
    updateCheckHighlight();
  }, [updateCheckHighlight]);

  const updateEval = useCallback(() => {
    setEvalScore(evaluateMaterial(boardRef.current));
  }, []);

  const updateMateHints = useCallback(() => {
    if (!showHints) {
      setMateSquares([]);
      return;
    }
    const game = chessRef.current;
    if (game.isGameOver()) {
      setMateSquares([]);
      return;
    }
    const movesVerbose = game.moves({ verbose: true });
    const mates = [];
    for (const move of movesVerbose) {
      game.move(move);
      const isMate = game.isCheckmate();
      game.undo();
      if (isMate) {
        const toSq = algToSq(move.to);
        if (toSq !== null) mates.push(toSq);
      }
    }
    setMateSquares(mates);
  }, [showHints]);

  const findKingSquare = useCallback((side) => {
    for (let sq = 0; sq < 128; sq++) {
      if (!inside(sq)) {
        sq += 7;
        continue;
      }
      if (boardRef.current[sq] === side * KING) return sq;
    }
    return null;
  }, []);

  const updateCheckHighlight = useCallback(() => {
    const game = chessRef.current;
    if (!game.isCheck()) {
      setCheckSquare(null);
      return;
    }
    const kingSq = findKingSquare(sideRef.current);
    setCheckSquare(kingSq);
  }, [findKingSquare]);

  useEffect(() => {
    updateEval();
  }, [updateEval]);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayEval(evalScore);
      return undefined;
    }
    let frame;
    const animate = () => {
      setDisplayEval((prev) => {
        const diff = evalScore - prev;
        if (Math.abs(diff) < 1) return evalScore;
        frame = requestAnimationFrame(animate);
        return prev + diff * 0.1;
      });
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [evalScore, reduceMotion]);

  useEffect(() => {
    // Load piece sprites
    const imgs = {};
    let loaded = 0;
    const total = 12;
    const pieces = [PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING];

    for (const type of pieces) {
      for (const side of [WHITE, BLACK]) {
        const key = String(side * type);
        const img = new Image();
        img.onload = img.onerror = () => {
          loaded += 1;
          if (loaded >= total) setSpritesReady(true);
        };
        img.src = spritePaths[key];
        imgs[key] = img;
      }
    }

    spritesRef.current = imgs;
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = img.onerror = () => {
      setBoardTextureReady(true);
      requestRender();
    };
    img.src = boardTexturePath;
    boardTextureRef.current = img;
  }, [requestRender]);

  useEffect(() => {
    if (!boardWrapperRef.current || typeof ResizeObserver === "undefined")
      return undefined;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        const size = Math.floor(Math.min(width, height));
        if (size > 0) setBoardPixelSize(clamp(size, 260, SIZE));
      }
    });
    ro.observe(boardWrapperRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return undefined;
    const updateCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      squareSizeRef.current = boardPixelSize / 8;
      canvas.width = Math.round(boardPixelSize * dpr);
      canvas.height = Math.round(boardPixelSize * dpr);
      canvas.style.width = `${boardPixelSize}px`;
      canvas.style.height = `${boardPixelSize}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
      }
      requestRender();
    };
    updateCanvas();
    window.addEventListener("resize", updateCanvas);
    return () => window.removeEventListener("resize", updateCanvas);
  }, [boardPixelSize, requestRender]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current && !gameOverRef.current) advanceClock();
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    syncBoardFromChess();
    updateEval();
    updateMateHints();
  }, [syncBoardFromChess, updateEval, updateMateHints]);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (!storedGame?.pgn) {
      hasRestoredRef.current = true;
      return;
    }

    stopAi();
    cancelReplay();
    chessRef.current.reset();

    const loaded = safeLoadPgn(chessRef.current, storedGame.pgn);
    if (!loaded) {
      hasRestoredRef.current = true;
      return;
    }

    syncBoardFromChess();
    setSanLog(chessRef.current.history());
    setSelected(null);
    setMoves([]);
    lastMoveRef.current = null;
    trailsRef.current = [];
    particlesRef.current = [];
    animationsRef.current = [];

    updateEval();
    updateMateHints();

    const isOver = chessRef.current.isGameOver();
    setGameOver(isOver);
    gameOverRef.current = isOver;

    if (storedGame?.paused) {
      pausedRef.current = true;
      setPaused(true);
      clockRef.current.active = null;
      setStatus("Paused.");
    } else {
      pausedRef.current = false;
      setPaused(false);
      startClockForSide(sideRef.current);
      setStatus(
        sideRef.current === playerSideRef.current ? "Your move" : "AI thinking...",
      );
      if (
        sideRef.current !== playerSideRef.current &&
        !gameOverRef.current &&
        !pausedRef.current
      ) {
        aiTimeoutRef.current = setTimeout(
          () => aiMoveRef.current?.(),
          reduceMotion ? 100 : 260,
        );
      }
    }

    hasRestoredRef.current = true;
  }, [
    cancelReplay,
    playerSide,
    reduceMotion,
    stopAi,
    storedGame,
    syncBoardFromChess,
    updateEval,
    updateMateHints,
  ]);

  const persistSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        settings: {
          playerSide,
          aiDepth,
          analysisDepth,
          sound,
          showHints,
          showArrows,
          showCoordinates,
          pieceSet,
          orientation,
        },
        game: {
          pgn: chessRef.current.pgn(),
          paused,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [
    aiDepth,
    analysisDepth,
    orientation,
    paused,
    pieceSet,
    playerSide,
    showArrows,
    showCoordinates,
    showHints,
    sound,
  ]);

  useEffect(() => {
    if (!hasRestoredRef.current) return;
    persistSession();
  }, [persistSession, sanLog]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const worker = new Worker(
      new URL("./chess.engine.worker.ts", import.meta.url),
    );
    engineWorkerRef.current = worker;
    const callbacks = engineCallbacksRef.current;
    const handleMessage = (event) => {
      const payload = event.data;
      if (!payload || (payload.type !== "result" && payload.type !== "error"))
        return;
      const { channel, requestId } = payload;
      const tracker =
        channel === "ai" ? aiTrackerRef.current : analysisTrackerRef.current;
      if (!tracker.isLatest(requestId)) return;
      const key = `${channel}:${requestId}`;
      const callback = engineCallbacksRef.current.get(key);
      if (callback) {
        callback(payload);
        engineCallbacksRef.current.delete(key);
      }
    };
    worker.addEventListener("message", handleMessage);
    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      engineWorkerRef.current = null;
      callbacks.clear();
    };
  }, []);

  useEffect(() => {
    return () => {
      stopAi();
      cancelReplay();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [cancelReplay, stopAi]);

  const advanceClock = () => {
    if (modeRef.current !== "play") return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const clock = clockRef.current;

    if (clock.active === null) {
      clock.lastTick = now;
      return;
    }

    const delta = Math.max(0, now - clock.lastTick);
    clock.lastTick = now;

    if (clock.active === WHITE) clock.white += delta;
    else clock.black += delta;

    setClockDisplay({ white: clock.white, black: clock.black });
  };

  const startClockForSide = (side) => {
    if (modeRef.current !== "play") return;
    const clock = clockRef.current;
    clock.active = side;
    clock.lastTick = typeof performance !== "undefined" ? performance.now() : Date.now();
    clock.resumeTarget = side;
  };

  const addTrail = (from, to) => {
    const sq = squareSizeRef.current;
    const fx = (from & 7) * sq + sq / 2;
    const fy = (7 - (from >> 4)) * sq + sq / 2;
    const tx = (to & 7) * sq + sq / 2;
    const ty = (7 - (to >> 4)) * sq + sq / 2;
    trailsRef.current.push({ fx, fy, tx, ty, t: performance.now() });
    requestRender();
  };

  const addCaptureSparks = (sq) => {
    if (reduceMotion) return;
    const size = squareSizeRef.current;
    const cx = (sq & 7) * size + size / 2;
    const cy = (7 - (sq >> 4)) * size + size / 2;
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 3;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        a: 1,
        r: 1 + Math.random() * 2,
        c: Math.random() < 0.5 ? "rgba(250, 204, 21," : "rgba(59, 130, 246,",
        t: performance.now(),
      });
    }
    requestRender();
  };

  const startMoveAnimation = (piece, from, to) => {
    if (reduceMotion || !piece) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    animationsRef.current.push({ piece, from, to, start: now, duration: 260 });
    requestRender();
  };

  const endGame = (result) => {
    const player = elo;
    const opp = 900 + aiDepthRef.current * 200;
    const expected = 1 / (1 + 10 ** ((opp - player) / 400));
    const score = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
    const k = 24;
    const newElo = Math.round(player + k * (score - expected));
    setElo(newElo);
    try {
      localStorage.setItem("chessElo", String(newElo));
    } catch {}
  };

  const checkGameState = (defaultStatus) => {
    const game = chessRef.current;

    if (game.isCheckmate()) {
      const loser = game.turn() === "w" ? WHITE : BLACK;
      const winner = -loser;
      const youWin = winner === playerSideRef.current;

      if (modeRef.current === "puzzle") {
        setStatus("Puzzle solved. Checkmate!");
      } else {
        setStatus(youWin ? "Checkmate! You win." : "Checkmate! You lose.");
      }
      setGameOver(true);
      pausedRef.current = true;
      setPaused(true);
      advanceClock();
      clockRef.current.active = null;
      if (modeRef.current === "play") {
        endGame(youWin ? "win" : "loss");
      }
      return true;
    }

    if (game.isDraw()) {
      let drawReason = "Draw.";
      if (game.isStalemate?.()) drawReason = "Draw by stalemate.";
      else if (game.isThreefoldRepetition?.())
        drawReason = "Draw by threefold repetition.";
      else if (game.isInsufficientMaterial?.())
        drawReason = "Draw by insufficient material.";
      else if (game.isDraw?.()) drawReason = "Draw.";
      setStatus(modeRef.current === "puzzle" ? "Puzzle drawn." : drawReason);
      setGameOver(true);
      pausedRef.current = true;
      setPaused(true);
      advanceClock();
      clockRef.current.active = null;
      if (modeRef.current === "play") {
        endGame("draw");
      }
      return true;
    }

    if (game.isCheck()) {
      updateCheckHighlight();
      setStatus(
        modeRef.current === "play"
          ? sideRef.current === playerSideRef.current
            ? "Check! Your move."
            : "Check! AI thinking..."
          : "Check!",
      );
      return false;
    }

    updateCheckHighlight();
    setStatus(defaultStatus || "Your move");
    return false;
  };

  const findVerboseMove = (fromAlg, toAlg) => {
    const list = chessRef.current.moves({ verbose: true });
    const candidates = list.filter((m) => m.from === fromAlg && m.to === toAlg);
    if (!candidates.length) return null;
    const queen = candidates.find((m) => m.promotion === "q");
    return queen || candidates[0];
  };

  const getDefaultStatus = () => {
    if (modeRef.current === "play") {
      return sideRef.current === playerSideRef.current
        ? "Your move"
        : "AI thinking...";
    }
    if (modeRef.current === "puzzle") {
      const currentPuzzle = puzzles[puzzleIndex];
      if (currentPuzzle) {
        const sideLabel = currentPuzzle.sideToMove === "w" ? "White" : "Black";
        return `${currentPuzzle.title} — ${sideLabel} to move.`;
      }
      return "Puzzle mode.";
    }
    if (modeRef.current === "opening") {
      const opening = openings[openingIndex];
      return opening ? `Opening trainer: ${opening.name}` : "Opening trainer.";
    }
    return "Your move";
  };

  const revertLastMove = () => {
    chessRef.current.undo();
    syncBoardFromChess();
    setSanLog((l) => l.slice(0, -1));
    setSelected(null);
    setMoves([]);
    trailsRef.current = [];
    particlesRef.current = [];
    animationsRef.current = [];
    lastMoveRef.current = null;
    requestRender();
  };

  const applyOpeningTrainerMove = (expectedMove) => {
    if (!expectedMove) return;
    const match = findVerboseMove(expectedMove.from, expectedMove.to);
    if (!match) return;
    applyMove(match, { announce: true, triggerAi: false, auto: true });
  };

  const handleOpeningProgress = (move) => {
    const opening = openings[openingIndex];
    if (!opening) return;
    if (openingOutOfLine) {
      setOpeningFeedback("This is outside the selected line.");
      return;
    }
    const expected = opening.moves[openingStep];
    if (!expected) {
      setOpeningFeedback("Line complete. Keep playing from here.");
      return;
    }
    const matches =
      move.from === expected.from &&
      move.to === expected.to &&
      (move.promotion || null) === (expected.promotion || null);
    if (!matches) {
      setOpeningFeedback("This is still playable, but outside the selected line.");
      setOpeningOutOfLine(true);
      return;
    }
    setOpeningFeedback("On book.");
    let nextStep = openingStep + 1;
    const nextExpected = opening.moves[nextStep];
    if (nextExpected && sideRef.current !== playerSideRef.current) {
      setTimeout(() => applyOpeningTrainerMove(nextExpected), reduceMotion ? 60 : 220);
      nextStep += 1;
    }
    setOpeningStep(nextStep);
  };

  const applyPuzzleReplyMove = (expectedMove) => {
    if (!expectedMove) return;
    const match = findVerboseMove(expectedMove.from, expectedMove.to);
    if (!match) return;
    applyMove(match, { announce: true, triggerAi: false, auto: true });
  };

  const handlePuzzleProgress = (move) => {
    const puzzle = puzzles[puzzleIndex];
    if (!puzzle) return;
    const expected = puzzle.solution[puzzleStep];
    if (!expected) return;
    const matches =
      move.from === expected.from &&
      move.to === expected.to &&
      (move.promotion || null) === (expected.promotion || null);
    if (!matches) {
      setPuzzleStatus("Incorrect — try again.");
      setStatus("Puzzle move was incorrect.");
      revertLastMove();
      return;
    }
    let nextStep = puzzleStep + 1;
    setPuzzleStatus("Correct move.");
    if (nextStep >= puzzle.solution.length) {
      setPuzzleStatus("Puzzle solved!");
      setStatus("Puzzle solved!");
      setGameOver(true);
      gameOverRef.current = true;
      pausedRef.current = true;
      setPaused(true);
      setPuzzleStreak((prev) => {
        const nextStreak = prev + 1;
        try {
          localStorage.setItem("chessPuzzleStreak", String(nextStreak));
        } catch {}
        return nextStreak;
      });
      return;
    }
    const nextExpected = puzzle.solution[nextStep];
    if (nextExpected && sideRef.current !== playerSideRef.current) {
      setTimeout(() => applyPuzzleReplyMove(nextExpected), reduceMotion ? 60 : 220);
      nextStep += 1;
    }
    setPuzzleStep(nextStep);
  };

  const revealPuzzleSolution = () => {
    setPuzzleSolutionShown(true);
    const puzzle = puzzles[puzzleIndex];
    if (!puzzle) return;
    setPuzzleStatus(
      `Solution: ${puzzle.solution.map((move) => move.san).join(" ")}`,
    );
  };

  const applyMove = (move, opts = {}) => {
    const {
      announce = true,
      triggerAi = true,
      fromSqOverride = null,
      toSqOverride = null,
      auto = false,
    } = opts;
    if (!move) return false;

    const fromSq = fromSqOverride ?? algToSq(move.from);
    const toSq = toSqOverride ?? algToSq(move.to);
    if (fromSq === null || toSq === null) return false;

    const movingPiece = boardRef.current[fromSq];
    const flags = typeof move.flags === "string" ? move.flags : "";
    const isCastle = flags.includes("k") || flags.includes("q");
    const isEnPassant = flags.includes("e");
    const isCapture = Boolean(move.captured) || isEnPassant;
    const captureSq = isEnPassant
      ? toSq + (sideRef.current === WHITE ? -16 : 16)
      : toSq;

    startMoveAnimation(movingPiece, fromSq, toSq);
    addTrail(fromSq, toSq);
    if (isCapture) addCaptureSparks(captureSq);

    if (isCastle) {
      const rank = fromSq >> 4;
      const rookFrom = flags.includes("k") ? rank * 16 + 7 : rank * 16;
      const rookTo = flags.includes("k") ? rank * 16 + 5 : rank * 16 + 3;
      const rookPiece = boardRef.current[rookFrom];
      if (rookPiece) startMoveAnimation(rookPiece, rookFrom, rookTo);
      addTrail(rookFrom, rookTo);
    }

    const res = chessRef.current.move(move);
    if (!res) return false;

    syncBoardFromChess();
    requestRender();

    if (announce) {
      setSanLog((l) => [...l, res.san]);
      playBeep();
    }

    lastMoveRef.current = { from: fromSq, to: toSq };
    setSelected(null);
    setMoves([]);

    advanceClock();
    if (!pausedRef.current) startClockForSide(sideRef.current);

    updateEval();
    updateMateHints();

    const ended = checkGameState(getDefaultStatus());
    if (ended) {
      stopAi();
      return true;
    }

    if (modeRef.current === "puzzle" && !auto) {
      handlePuzzleProgress(res);
    }

    if (modeRef.current === "opening" && !auto) {
      handleOpeningProgress(res);
    }

    if (
      triggerAi &&
      modeRef.current === "play" &&
      !pausedRef.current &&
      sideRef.current !== playerSideRef.current
    ) {
      stopAi();
      aiTimeoutRef.current = setTimeout(
        () => aiMoveRef.current?.(),
        reduceMotion ? 100 : 260,
      );
    }

    return true;
  };

  const aiMove = () => {
    stopAi();
    if (pausedRef.current || gameOverRef.current) return;
    if (sideRef.current === playerSideRef.current) return;
    if (aiThinkingRef.current) return;
    setAiThinking(true);
    sendEngineRequest("ai", chessRef.current.fen(), aiDepthRef.current, 1, (payload) => {
      setAiThinking(false);
      if (payload.type === "error") return;
      let chosen = null;
      if (payload.suggestions?.length) {
        const suggestion = payload.suggestions[0];
        chosen = findVerboseMove(suggestion.from, suggestion.to);
      }
      if (!chosen) {
        const list = chessRef.current.moves({ verbose: true });
        chosen = list[Math.floor(Math.random() * list.length)];
      }
      applyMove(chosen, { announce: true, triggerAi: false });
    });
  };

  aiMoveRef.current = aiMove;

  const resetGame = useCallback(({ autoplayAi } = { autoplayAi: true }) => {
    stopAi();
    cancelReplay();

    chessRef.current.reset();
    syncBoardFromChess();

    setSelected(null);
    setCursor(0);
    setMoves([]);
    trailsRef.current = [];
    particlesRef.current = [];
    animationsRef.current = [];
    setHoverSquare(null);
    setCheckSquare(null);
    setPgnError("");
    setPromotionPrompt(null);
    setPromotionIndex(0);

    setSanLog([]);
    setAnalysisMoves([]);
    setAnalysisPending(false);
    setAnalysisError("");
    setGameOver(false);
    gameOverRef.current = false;
    lastMoveRef.current = null;

    clockRef.current = {
      white: 0,
      black: 0,
      active: WHITE,
      lastTick: typeof performance !== "undefined" ? performance.now() : Date.now(),
      resumeTarget: WHITE,
    };

    setClockDisplay({ white: 0, black: 0 });

    pausedRef.current = false;
    setPaused(false);
    startClockForSide(WHITE);

    updateEval();
    updateMateHints();
    updateCheckHighlight();

    if (autoplayAi && playerSideRef.current === BLACK) {
      setStatus("AI thinking...");
      aiTimeoutRef.current = setTimeout(
        () => aiMoveRef.current?.(),
        reduceMotion ? 100 : 260,
      );
    } else {
      setStatus("Your move");
    }
  }, [
    cancelReplay,
    reduceMotion,
    stopAi,
    syncBoardFromChess,
    updateCheckHighlight,
    updateEval,
    updateMateHints,
  ]);

  const loadPuzzle = useCallback(
    (index) => {
      const puzzle = puzzles[index];
      if (!puzzle) return;
      stopAi();
      cancelReplay();

      chessRef.current.reset();
      const loaded = safeLoadFen(chessRef.current, puzzle.fen);
      if (!loaded) return;

      syncBoardFromChess();
      setSanLog([]);
      setAnalysisMoves([]);
      setAnalysisPending(false);
      setAnalysisError("");
      setGameOver(false);
      gameOverRef.current = false;
      lastMoveRef.current = null;
      trailsRef.current = [];
      particlesRef.current = [];
      animationsRef.current = [];
      setSelected(null);
      setMoves([]);
      setHoverSquare(null);
      setCheckSquare(null);
      setPuzzleStep(0);
      setPuzzleStatus("");
      setPuzzleSolutionShown(false);
      setOpeningFeedback("");
      setOpeningOutOfLine(false);
      setPgnError("");

      const side = puzzle.sideToMove === "w" ? WHITE : BLACK;
      playerSideRef.current = side;
      setPlayerSide(side);
      setOrientation(side === WHITE ? "white" : "black");

      clockRef.current.active = null;
      clockRef.current.white = 0;
      clockRef.current.black = 0;
      setClockDisplay({ white: 0, black: 0 });

      pausedRef.current = false;
      setPaused(false);

      const sideLabel = side === WHITE ? "White" : "Black";
      setStatus(`${puzzle.title} — ${sideLabel} to move.`);

      updateEval();
      updateMateHints();
      updateCheckHighlight();
      requestRender();
    },
    [
      cancelReplay,
      puzzles,
      requestRender,
      stopAi,
      syncBoardFromChess,
      updateCheckHighlight,
      updateEval,
      updateMateHints,
    ],
  );

  const loadOpening = useCallback(
    (index) => {
      const opening = openings[index];
      if (!opening) return;
      stopAi();
      cancelReplay();

      chessRef.current.reset();
      syncBoardFromChess();
      setSanLog([]);
      setAnalysisMoves([]);
      setAnalysisPending(false);
      setAnalysisError("");
      setGameOver(false);
      gameOverRef.current = false;
      lastMoveRef.current = null;
      trailsRef.current = [];
      particlesRef.current = [];
      animationsRef.current = [];
      setSelected(null);
      setMoves([]);
      setHoverSquare(null);
      setCheckSquare(null);
      setOpeningStep(0);
      setOpeningFeedback("Follow the highlighted line to practice this opening.");
      setOpeningOutOfLine(false);
      setPgnError("");

      playerSideRef.current = WHITE;
      setPlayerSide(WHITE);
      setOrientation("white");

      clockRef.current.active = null;
      clockRef.current.white = 0;
      clockRef.current.black = 0;
      setClockDisplay({ white: 0, black: 0 });

      pausedRef.current = false;
      setPaused(false);

      setStatus(`Opening trainer: ${opening.name}`);

      updateEval();
      updateMateHints();
      updateCheckHighlight();
      requestRender();
    },
    [
      cancelReplay,
      openings,
      requestRender,
      stopAi,
      syncBoardFromChess,
      updateCheckHighlight,
      updateEval,
      updateMateHints,
    ],
  );

  useEffect(() => {
    if (skipInitialResetRef.current) {
      skipInitialResetRef.current = false;
      return;
    }
    if (modeRef.current !== "play") return;
    setOrientation(playerSide === WHITE ? "white" : "black");
    resetGame({ autoplayAi: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerSide]);

  const undoMove = () => {
    if (modeRef.current !== "play") return;
    stopAi();
    cancelReplay();
    if (chessRef.current.history().length === 0) return;

    chessRef.current.undo();
    syncBoardFromChess();
    setSanLog((l) => l.slice(0, -1));

    if (
      chessRef.current.turn() === "b" &&
      chessRef.current.history().length > 0
    ) {
      chessRef.current.undo();
      syncBoardFromChess();
      setSanLog((l) => l.slice(0, -1));
    }

    setSelected(null);
    setMoves([]);
    trailsRef.current = [];
    particlesRef.current = [];
    animationsRef.current = [];
    lastMoveRef.current = null;
    setCheckSquare(null);

    updateEval();
    updateMateHints();

    clockRef.current.white = 0;
    clockRef.current.black = 0;
    clockRef.current.lastTick =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    clockRef.current.resumeTarget = sideRef.current;

    setClockDisplay({ white: clockRef.current.white, black: clockRef.current.black });

    if (sideRef.current !== playerSideRef.current) {
      pausedRef.current = true;
      setPaused(true);
      clockRef.current.active = null;
      setStatus("Undo complete. Resume when ready — AI to move.");
    } else {
      pausedRef.current = false;
      setPaused(false);
      startClockForSide(sideRef.current);
      setStatus("Your move");
    }
  };

  const togglePause = () => {
    if (modeRef.current !== "play") return;
    setPaused((prev) => {
      if (!prev) {
        stopAi();
        advanceClock();
        clockRef.current.resumeTarget =
          clockRef.current.active ?? sideRef.current;
        clockRef.current.active = null;
        setStatus("Paused.");
      } else {
        const resumeSide = clockRef.current.resumeTarget ?? sideRef.current;
        startClockForSide(resumeSide);
        setStatus(resumeSide === playerSideRef.current ? "Your move" : "AI thinking...");
        if (resumeSide !== playerSideRef.current && !gameOverRef.current) {
          aiTimeoutRef.current = setTimeout(
            () => aiMoveRef.current?.(),
            reduceMotion ? 120 : 260,
          );
        }
      }
      return !prev;
    });
  };

  const toggleSound = () => setSound((s) => !s);
  const toggleHints = () => setShowHints((s) => !s);
  const togglePieces = () =>
    setPieceSet((p) => (p === "sprites" ? "unicode" : "sprites"));
  const toggleArrows = () => setShowArrows((s) => !s);
  const toggleCoordinates = () => setShowCoordinates((s) => !s);
  const flipBoard = () => {
    setHoverSquare(null);
    setOrientation((o) => (o === "white" ? "black" : "white"));
  };

  const copyMoves = () => {
    navigator.clipboard?.writeText(chessRef.current.pgn());
  };

  const loadPGNString = (pgn) => {
    if (!pgn) return;
    if (modeRef.current !== "play") {
      skipModeResetRef.current = true;
      setMode("play");
    }
    resetGame({ autoplayAi: false });
    setPgnError("");

    if (!safeLoadPgn(chessRef.current, pgn)) {
      setPgnError("Invalid PGN. Please check the file and try again.");
      setStatus("PGN load failed.");
      resetGame({ autoplayAi: true });
      return;
    }

    const movesList = chessRef.current.history({ verbose: true });
    chessRef.current.reset();
    syncBoardFromChess();
    setSanLog([]);

    pausedRef.current = true;
    setPaused(true);
    clockRef.current.active = null;
    clockRef.current.white = 0;
    clockRef.current.black = 0;
    clockRef.current.resumeTarget = WHITE;
    setClockDisplay({ white: 0, black: 0 });
    setStatus("Replaying PGN...");

    const token = replayTokenRef.current + 1;
    replayTokenRef.current = token;

    let i = 0;
    const playNext = () => {
      if (replayTokenRef.current !== token) return;
      if (i >= movesList.length) {
        pausedRef.current = false;
        setPaused(false);
        startClockForSide(sideRef.current);
        checkGameState("Your move");
        return;
      }
      const m = movesList[i++];
      const res = chessRef.current.move(m);
      if (!res) return;

      const from = algToSq(m.from);
      const to = algToSq(m.to);
      if (from === null || to === null) return;

      const movingPiece = boardRef.current[from];
      const flags = typeof m.flags === "string" ? m.flags : "";
      const isEnPassant = flags.includes("e");
      const isCastle = flags.includes("k") || flags.includes("q");
      const captureSq = isEnPassant
        ? to + (sideRef.current === WHITE ? -16 : 16)
        : to;
      startMoveAnimation(movingPiece, from, to);
      addTrail(from, to);
      if (m.captured || isEnPassant) addCaptureSparks(captureSq);

      if (isCastle) {
        const rank = from >> 4;
        const rookFrom = flags.includes("k") ? rank * 16 + 7 : rank * 16;
        const rookTo = flags.includes("k") ? rank * 16 + 5 : rank * 16 + 3;
        const rookPiece = boardRef.current[rookFrom];
        if (rookPiece) startMoveAnimation(rookPiece, rookFrom, rookTo);
        addTrail(rookFrom, rookTo);
      }

      syncBoardFromChess();
      lastMoveRef.current = { from, to };
      setSanLog((l) => [...l, res.san]);
      updateEval();
      updateMateHints();
      playBeep();
      checkGameState(undefined);

      replayTimeoutRef.current = setTimeout(playNext, 500);
    };

    playNext();
  };

  const handlePGNImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadPGNString(String(reader.result || ""));
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadPGN = () => {
    pgnInputRef.current?.click();
  };

  const sendEngineRequest = useCallback(
    (channel, fen, depth, maxSuggestions, onResult) => {
      const worker = engineWorkerRef.current;
      const tracker =
        channel === "ai" ? aiTrackerRef.current : analysisTrackerRef.current;
      const requestId = tracker.next();
      const key = `${channel}:${requestId}`;
      engineCallbacksRef.current.set(key, onResult);
      if (!worker) {
        onResult({
          type: "error",
          channel,
          requestId,
          message: "Engine unavailable",
        });
        engineCallbacksRef.current.delete(key);
        return requestId;
      }
      worker.postMessage({
        type: "suggest",
        channel,
        fen,
        depth,
        maxSuggestions,
        requestId,
      });
      return requestId;
    },
    [],
  );

  const runAnalysis = () => {
    setAnalysisPending(true);
    setAnalysisError("");
    setAnalysisMoves([]);
    sendEngineRequest("analysis", chessRef.current.fen(), analysisDepth, 5, (payload) => {
      if (payload.type === "error") {
        setAnalysisError(payload.message || "Analysis failed.");
        setAnalysisPending(false);
        return;
      }
      setAnalysisMoves(payload.suggestions || []);
      setAnalysisPending(false);
    });
  };

  useEffect(() => {
    renderFrameRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const size = boardPixelSize;
      const sq = squareSizeRef.current;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();

      const cache = boardCacheRef.current;
      const dpr = dprRef.current;
      if (
        !cache.canvas ||
        cache.size !== size ||
        cache.dpr !== dpr ||
        cache.textureReady !== boardTextureReady
      ) {
        const baseCanvas = cache.canvas ?? document.createElement("canvas");
        baseCanvas.width = Math.round(size * dpr);
        baseCanvas.height = Math.round(size * dpr);
        const baseCtx = baseCanvas.getContext("2d");
        if (baseCtx) {
          baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
              const x = f * sq;
              const y = (7 - r) * sq;
              const light = (r + f) % 2 === 0;
              const dx = f - 3.5;
              const dy = r - 3.5;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const ambient = Math.max(0, 1 - dist / 4.2);
              if (light) {
                const tone = Math.round(224 + ambient * 22);
                baseCtx.fillStyle = `rgb(${tone},${tone},${tone + 6})`;
              } else {
                const base = Math.round(58 + ambient * 45);
                baseCtx.fillStyle = `rgb(${base},${base + 8},${base + 22})`;
              }
              baseCtx.fillRect(x, y, sq, sq);

              const sheen = baseCtx.createLinearGradient(x, y, x, y + sq);
              sheen.addColorStop(0, "rgba(255,255,255,0.08)");
              sheen.addColorStop(1, "rgba(0,0,0,0.18)");
              baseCtx.fillStyle = sheen;
              baseCtx.fillRect(x, y, sq, sq);
            }
          }
          if (boardTextureReady && boardTextureRef.current) {
            baseCtx.save();
            baseCtx.globalAlpha = 0.25;
            baseCtx.drawImage(boardTextureRef.current, 0, 0, size, size);
            baseCtx.restore();
          }
        }
        cache.canvas = baseCanvas;
        cache.size = size;
        cache.dpr = dpr;
        cache.textureReady = boardTextureReady;
      }

      ctx.clearRect(0, 0, size, size);
      if (cache.canvas) {
        ctx.drawImage(cache.canvas, 0, 0, size, size);
      }

      const activeAnimations = [];
      animationsRef.current = animationsRef.current.filter((anim) => {
        const duration = anim.duration || 260;
        const elapsed = now - anim.start;
        const progress = reduceMotion ? 1 : Math.min(1, elapsed / duration);
        if (progress >= 1) return false;
        anim.progress = progress;
        activeAnimations.push(anim);
        return true;
      });
      const suppressedSquares = new Set(activeAnimations.map((anim) => anim.to));

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const x = f * sq;
          const y = (7 - r) * sq;
          const sqIndex = r * 16 + f;
          if (
            lastMoveRef.current &&
            (sqIndex === lastMoveRef.current.from || sqIndex === lastMoveRef.current.to)
          ) {
            ctx.strokeStyle = "rgba(255, 217, 102, 0.9)";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y + 1.5, sq - 3, sq - 3);
          }

          if (checkSquare === sqIndex) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
            ctx.fillRect(x, y, sq, sq);
          }

          if (selected === sqIndex) {
            ctx.strokeStyle = "rgba(102, 204, 255, 0.9)";
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 2, y + 2, sq - 4, sq - 4);
          } else {
            const move = moves.find((m) => m.toSq === sqIndex);
            if (move) {
              if (move.isCapture) {
                ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x + sq / 2, y + sq / 2, sq * 0.32, 0, Math.PI * 2);
                ctx.stroke();
              } else {
                ctx.fillStyle = "rgba(102, 204, 255, 0.7)";
                ctx.beginPath();
                ctx.arc(x + sq / 2, y + sq / 2, sq * 0.16, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }

          if (cursor === sqIndex) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 3, y + 3, sq - 6, sq - 6);
          }

          if (mateSquares.includes(sqIndex)) {
            ctx.beginPath();
            ctx.arc(x + sq / 2, y + sq / 2, sq / 6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(64, 160, 255, 0.45)";
            ctx.fill();
          }

          if (hoverSquare === sqIndex && selected !== sqIndex) {
            const highlight = ctx.createRadialGradient(
              x + sq / 2,
              y + sq / 2,
              sq / 8,
              x + sq / 2,
              y + sq / 2,
              sq / 2,
            );
            highlight.addColorStop(0, "rgba(255,255,255,0.35)");
            highlight.addColorStop(1, "rgba(255,213,128,0.18)");
            ctx.fillStyle = highlight;
            ctx.fillRect(x, y, sq, sq);
            ctx.strokeStyle = "rgba(255, 223, 128, 0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, sq - 2, sq - 2);
          }

          const piece = boardRef.current[sqIndex];
          if (piece && !suppressedSquares.has(sqIndex)) {
            const img = spritesRef.current[String(piece)];
            if (pieceSet === "sprites" && img && spritesReady) {
              ctx.save();
              ctx.shadowColor = "rgba(0,0,0,0.35)";
              ctx.shadowBlur = 12;
              ctx.drawImage(img, x + 4, y + 4, sq - 8, sq - 8);
              ctx.restore();
            } else {
              ctx.font = `${sq - 10}px serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = piece > 0 ? "#111" : "#f8f8f8";
              ctx.fillText(pieceUnicode[String(piece)], x + sq / 2, y + sq / 2);
            }
          }
        }
      }

      if (showCoordinates) {
        ctx.font = `${Math.max(10, sq * 0.18)}px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace`;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        for (let f = 0; f < 8; f++) {
          const file = orientation === "white" ? files[f] : files[7 - f];
          const x = f * sq + 6;
          ctx.fillText(file, x, size - 6);
        }
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        for (let r = 0; r < 8; r++) {
          const rank = orientation === "white" ? r + 1 : 8 - r;
          const y = (7 - r) * sq + 6;
          ctx.fillText(String(rank), size - 6, y);
        }
      }

      if (showArrows) {
        trailsRef.current = trailsRef.current.filter((t) => now - t.t < 1000);
        for (const t of trailsRef.current) {
          const age = (now - t.t) / 1000;
          const alpha = reduceMotion ? 0.5 : Math.max(0, 1 - age);
          ctx.strokeStyle = `rgba(255, 200, 80, ${alpha})`;
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
          ctx.fillStyle = `rgba(255, 200, 80, ${alpha})`;
          ctx.fill();
        }
      } else {
        trailsRef.current = [];
      }

      particlesRef.current = particlesRef.current.filter((p) => now - p.t < 500);
      for (const p of particlesRef.current) {
        const age = (now - p.t) / 1000;
        const px = p.x + p.vx * age;
        const py = p.y + p.vy * age;
        const alpha = reduceMotion ? 0.7 : Math.max(0, 1 - age * 2);
        ctx.fillStyle = `${p.c}${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const anim of activeAnimations) {
        const progress = anim.progress ?? 0;
        const eased = 1 - Math.pow(1 - progress, 3);
        const fromFile = anim.from & 7;
        const fromRank = anim.from >> 4;
        const toFile = anim.to & 7;
        const toRank = anim.to >> 4;
        const fromX = fromFile * sq;
        const fromY = (7 - fromRank) * sq;
        const toX = toFile * sq;
        const toY = (7 - toRank) * sq;
        const drawX = fromX + (toX - fromX) * eased;
        const drawY = fromY + (toY - fromY) * eased;
        const img = spritesRef.current[String(anim.piece)];
        if (pieceSet === "sprites" && img && spritesReady) {
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 14;
          ctx.globalAlpha = 0.9;
          ctx.drawImage(img, drawX + 4, drawY + 4, sq - 8, sq - 8);
          ctx.restore();
        } else {
          ctx.font = `${sq - 10}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = anim.piece > 0 ? "#111" : "#f8f8f8";
          ctx.fillText(pieceUnicode[String(anim.piece)], drawX + sq / 2, drawY + sq / 2);
        }
      }

      animationsRef.current = activeAnimations;
      const needsAnimation =
        activeAnimations.length > 0 ||
        (showArrows && trailsRef.current.length > 0) ||
        particlesRef.current.length > 0;
      if (needsAnimation) requestRender();
    };
  }, [
    boardPixelSize,
    boardTextureReady,
    checkSquare,
    cursor,
    hoverSquare,
    mateSquares,
    moves,
    orientation,
    pieceSet,
    promotionPrompt,
    reduceMotion,
    requestRender,
    selected,
    showArrows,
    spritesReady,
    showCoordinates,
  ]);

  useEffect(() => {
    requestRender();
  }, [
    boardPixelSize,
    boardTextureReady,
    checkSquare,
    cursor,
    hoverSquare,
    mateSquares,
    moves,
    orientation,
    pieceSet,
    reduceMotion,
    requestRender,
    selected,
    showArrows,
    showCoordinates,
    spritesReady,
  ]);

  const handleSquare = (sq) => {
    if (pausedRef.current || gameOverRef.current) return;
    if (sideRef.current !== playerSideRef.current) return;
    if (promotionPrompt) return;

    setCursor(sq);
    const side = sideRef.current;

    if (selected !== null) {
      const legalMoves = moves
        .filter((m) => m.toSq === sq)
        .slice()
        .sort((a, b) => {
          const order = { q: 0, r: 1, b: 2, n: 3 };
          return (order[a.promotion] ?? 99) - (order[b.promotion] ?? 99);
        });
      if (legalMoves.length > 1) {
        setPromotionPrompt({
          fromSq: selected,
          toSq: sq,
          moves: legalMoves,
          side,
        });
        setPromotionIndex(0);
        return;
      }
      if (legalMoves.length === 1) {
        applyMove(legalMoves[0], { announce: true, triggerAi: true });
        return;
      }
      setSelected(null);
      setMoves([]);
    } else if (boardRef.current[sq] * side > 0) {
      setSelected(sq);
      const legals = chessRef.current
        .moves({ square: sqToAlg(sq), verbose: true })
        .map((m) => ({
          ...m,
          fromSq: algToSq(m.from),
          toSq: algToSq(m.to),
          isCapture:
            Boolean(m.captured) || (typeof m.flags === "string" && m.flags.includes("e")),
        }))
        .filter((m) => m.fromSq !== null && m.toSq !== null);
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
    canvasRef.current?.focus();
    const sq = getSquareFromEvent(e);
    if (sq !== null) handleSquare(sq);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    e.preventDefault();
    canvasRef.current?.focus();
    const sq = getSquareFromEvent(touch);
    if (sq !== null) handleSquare(sq);
  };

  const handleMouseMove = (e) => {
    if (promotionPrompt) return;
    const sq = getSquareFromEvent(e);
    if (sq !== null) setHoverSquare(sq);
    else setHoverSquare(null);
  };

  const handleMouseLeave = () => setHoverSquare(null);

  const confirmPromotion = (move) => {
    if (!move) return;
    setPromotionPrompt(null);
    applyMove(move, { announce: true, triggerAi: true });
  };

  const handleKey = (e) => {
    if (pausedRef.current || gameOverRef.current) return;
    if (sideRef.current !== playerSideRef.current) return;
    if (promotionPrompt) {
      if (e.key === "Escape") {
        e.preventDefault();
        setPromotionPrompt(null);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPromotionIndex((prev) => (prev + 1) % promotionPrompt.moves.length);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPromotionIndex((prev) =>
          (prev - 1 + promotionPrompt.moves.length) %
          promotionPrompt.moves.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const choice = promotionPrompt.moves[promotionIndex];
        setPromotionPrompt(null);
        applyMove(choice, { announce: true, triggerAi: true });
        return;
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setSelected(null);
      setMoves([]);
      return;
    }
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

  const moveLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i < sanLog.length; i += 2) {
      lines.push(
        `${i / 2 + 1}. ${sanLog[i]}${sanLog[i + 1] ? " " + sanLog[i + 1] : ""}`,
      );
    }
    return lines;
  }, [sanLog]);

  const statusTone = status.includes("Checkmate")
    ? "bg-red-600/80 text-white"
    : status.includes("Check")
      ? "bg-amber-400/80 text-slate-900"
      : status.includes("Paused")
        ? "bg-slate-600/80 text-white"
        : "bg-slate-800/70 text-slate-100";

  const whiteClock = formatClock(clockDisplay.white);
  const blackClock = formatClock(clockDisplay.black);
  const orientationLabel = orientation === "white" ? "White" : "Black";
  const formattedEval = (evalScore / 100).toFixed(2);
  const engineSuggestions = analysisMoves.slice(0, 5);
  const evalPercent = (1 / (1 + Math.exp(-displayEval / 200))) * 100;
  const youLabel = playerSide === WHITE ? "White" : "Black";
  const boardTransform = orientation === "white" ? "rotate(0deg)" : "rotate(180deg)";
  const currentPuzzle = puzzles[puzzleIndex];
  const currentOpening = openings[openingIndex];
  const promotionMoves = promotionPrompt?.moves ?? [];
  const promotionPosition = promotionPrompt
    ? {
        left: (promotionPrompt.toSq & 7) * squareSizeRef.current,
        top:
          (7 - (promotionPrompt.toSq >> 4)) * squareSizeRef.current,
      }
    : null;

  const buttonClass =
    "rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 font-semibold uppercase tracking-wide text-slate-200 transition-colors duration-150 hover:border-sky-400 hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="h-full w-full select-none bg-ub-cool-grey p-2 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col items-center gap-4">
          <div ref={boardWrapperRef} className="w-full">
            <div className="mx-auto flex justify-center">
              <div
                className="relative"
                style={{
                  width: boardPixelSize,
                  height: boardPixelSize,
                  transform: boardTransform,
                  transformOrigin: "center",
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={SIZE}
                  height={SIZE}
                  onClick={handleClick}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleTouchStart}
                  onKeyDown={handleKey}
                  tabIndex={0}
                  aria-label="Chess board"
                  aria-describedby="chess-board-instructions"
                  className="touch-none rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-black shadow-[0_30px_60px_rgba(0,0,0,0.45)] outline-none transition-transform duration-500 ease-out focus-visible:ring-2 focus-visible:ring-sky-400"
                  style={{
                    width: boardPixelSize,
                    height: boardPixelSize,
                  }}
                />
                {promotionPrompt ? (
                  <div
                    className="absolute z-20 rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-lg backdrop-blur"
                    style={{
                      left: promotionPosition?.left ?? 0,
                      top: promotionPosition?.top ?? 0,
                    }}
                    role="dialog"
                    aria-label="Choose promotion piece"
                  >
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                      Promote to
                    </div>
                    <div className="flex gap-2">
                      {promotionMoves.map((move, idx) => (
                        <button
                          key={`${move.promotion}-${idx}`}
                          type="button"
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition ${
                            idx === promotionIndex
                              ? "border-sky-400 bg-slate-800 text-sky-200"
                              : "border-slate-700 bg-slate-900 text-slate-200"
                          }`}
                          onClick={() => confirmPromotion(move)}
                          autoFocus={idx === promotionIndex}
                        >
                          {pieceUnicode[
                            String(
                              (promotionPrompt.side || WHITE) *
                              (move.promotion === "n"
                                ? KNIGHT
                                : move.promotion === "b"
                                  ? BISHOP
                                  : move.promotion === "r"
                                    ? ROOK
                                    : QUEEN),
                            )
                          ]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <p id="chess-board-instructions" className="sr-only">
            Use arrow keys to move the cursor, Enter or Space to select a piece or
            destination, and Escape to clear your selection.
          </p>
          <input
            type="file"
            accept=".pgn"
            ref={pgnInputRef}
            onChange={handlePGNImport}
            className="hidden"
            aria-label="PGN file input"
          />
          <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
            <button
              className={buttonClass}
              onClick={() => {
                if (mode === "play") resetGame();
                if (mode === "puzzle") loadPuzzle(puzzleIndex);
                if (mode === "opening") loadOpening(openingIndex);
              }}
              type="button"
            >
              {mode === "play" ? "Reset" : "Restart"}
            </button>
            <button
              className={buttonClass}
              onClick={undoMove}
              type="button"
              disabled={mode !== "play"}
            >
              Undo
            </button>
            <button
              className={buttonClass}
              onClick={togglePause}
              type="button"
              disabled={mode !== "play"}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button className={buttonClass} onClick={toggleSound} type="button">
              {sound ? "Sound On" : "Sound Off"}
            </button>
          </div>
        </div>
        <aside className="w-full flex-shrink-0 rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 shadow-[0_20px_45px_rgba(0,0,0,0.55)] backdrop-blur-md lg:w-80">
          <div className="space-y-6">
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold uppercase tracking-wide text-slate-200">
                <span aria-hidden>🧭</span>
                <span>Mode</span>
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                {[
                  { key: "play", label: "Play" },
                  { key: "puzzle", label: "Puzzles" },
                  { key: "opening", label: "Openings" },
                ].map((item) => (
                  <button
                    key={item.key}
                    className={`${buttonClass} ${
                      mode === item.key
                        ? "border-sky-400 bg-slate-800/80 text-sky-200"
                        : ""
                    }`}
                    onClick={() => setMode(item.key)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Switch between classic play, tactical puzzles, and opening drills.
              </p>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold uppercase tracking-wide text-slate-200">
                <span aria-hidden>♟️</span>
                <span>Game State</span>
              </h2>
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-semibold shadow-inner ${statusTone}`}
                aria-live="polite"
              >
                {status}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 shadow-inner">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                    <span aria-hidden>🕊️</span>
                    <span>White</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono text-slate-100">
                    {whiteClock}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 shadow-inner">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                    <span aria-hidden>🗡️</span>
                    <span>Black</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono text-slate-100">
                    {blackClock}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Turn: <span className="font-semibold text-slate-200">{turnLabel}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                You: <span className="font-semibold text-slate-200">{youLabel}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Orientation:{" "}
                <span className="font-semibold text-slate-200">{orientationLabel}</span>
              </div>
            </section>
            {mode === "puzzle" ? (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
                  <span aria-hidden>🧩</span>
                  <span>Puzzle</span>
                </h2>
                {currentPuzzle ? (
                  <>
                    <div className="mt-2 text-sm font-semibold text-slate-100">
                      {currentPuzzle.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Streak:{" "}
                      <span className="font-semibold text-slate-200">
                        {puzzleStreak}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-300" aria-live="polite">
                      {puzzleStatus || "Find the best move."}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                      <button
                        className={buttonClass}
                        onClick={() =>
                          setPuzzleIndex((prev) =>
                            puzzles.length
                              ? (prev - 1 + puzzles.length) % puzzles.length
                              : 0,
                          )
                        }
                        type="button"
                        disabled={!puzzles.length}
                      >
                        Previous
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() =>
                          setPuzzleIndex((prev) =>
                            puzzles.length ? (prev + 1) % puzzles.length : 0,
                          )
                        }
                        type="button"
                        disabled={!puzzles.length}
                      >
                        Next
                      </button>
                      <button
                        className={buttonClass}
                        onClick={revealPuzzleSolution}
                        type="button"
                      >
                        Show Solution
                      </button>
                    </div>
                    {puzzleSolutionShown ? (
                      <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-900/50 p-2 text-xs text-slate-200">
                        {currentPuzzle.solution.map((move) => move.san).join(" ")}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No puzzles loaded.</p>
                )}
              </section>
            ) : null}
            {mode === "opening" ? (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
                  <span aria-hidden>📚</span>
                  <span>Opening Trainer</span>
                </h2>
                {currentOpening ? (
                  <>
                    <div className="mt-2 text-sm font-semibold text-slate-100">
                      {currentOpening.name}
                    </div>
                    <div className="mt-2 text-xs text-slate-300" aria-live="polite">
                      {openingFeedback || "Follow the recommended line."}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                      <button
                        className={buttonClass}
                        onClick={() =>
                          setOpeningIndex((prev) =>
                            openings.length
                              ? (prev - 1 + openings.length) % openings.length
                              : 0,
                          )
                        }
                        type="button"
                        disabled={!openings.length}
                      >
                        Previous
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() =>
                          setOpeningIndex((prev) =>
                            openings.length ? (prev + 1) % openings.length : 0,
                          )
                        }
                        type="button"
                        disabled={!openings.length}
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No openings loaded.</p>
                )}
              </section>
            ) : null}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
                <span aria-hidden>🎛️</span>
                <span>Player Setup</span>
              </h2>
              <label
                className="mt-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400"
                htmlFor="chess-side"
              >
                <span>Play As</span>
                <select
                  id="chess-side"
                  className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  value={playerSide}
                  onChange={(e) => setPlayerSide(Number(e.target.value))}
                  disabled={mode !== "play"}
                >
                  <option value={WHITE}>White</option>
                  <option value={BLACK}>Black</option>
                </select>
              </label>
              <label
                className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400"
                htmlFor="chess-ai-depth"
              >
                <span>AI Depth</span>
                <select
                  id="chess-ai-depth"
                  className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  value={aiDepth}
                  onChange={(e) => setAiDepth(Number(e.target.value))}
                  disabled={mode !== "play"}
                >
                  {[1, 2, 3, 4].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs text-slate-400">
                {mode === "play"
                  ? "Changing sides restarts the game. The AI moves first when you choose Black."
                  : "Player settings are locked while training modes are active."}
              </p>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
                <span aria-hidden>📈</span>
                <span>Evaluation</span>
              </h2>
              <div
                className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800/60"
                role="progressbar"
                aria-label="Evaluation score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(evalPercent.toFixed(0))}
              >
                <div
                  className={`h-full ${displayEval >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                  style={{ width: `${evalPercent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                <span>Score {formattedEval}</span>
                <span>ELO {elo}</span>
              </div>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
                <span aria-hidden>📋</span>
                <span>Move List</span>
              </h2>
              <div
                className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm leading-relaxed shadow-inner"
                aria-label="Move list"
              >
                {moveLines.length > 0 ? (
                  <ol className="space-y-1">
                    {moveLines.map((line, idx) => (
                      <li
                        key={idx}
                        className={`font-mono ${
                          idx === moveLines.length - 1
                            ? "text-sky-300"
                            : "text-slate-200"
                        }`}
                      >
                        {line}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs italic text-slate-400">
                    No moves yet — make your first move to begin the story.
                  </p>
                )}
              </div>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
                <span aria-hidden>💡</span>
                <span>Engine Tips</span>
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Use the embedded engine for on-demand guidance. Higher depths explore more replies.
              </p>
              <label
                className="mt-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400"
                htmlFor="chess-depth"
              >
                <span>Depth</span>
                <select
                  id="chess-depth"
                  className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  value={analysisDepth}
                  onChange={(e) => setAnalysisDepth(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <button
                  className={buttonClass}
                  onClick={runAnalysis}
                  type="button"
                  disabled={analysisPending}
                  aria-busy={analysisPending}
                >
                  {analysisPending ? "Analyzing..." : "Analyze"}
                </button>
                <button className={buttonClass} onClick={copyMoves} type="button">
                  Copy PGN
                </button>
                <button className={buttonClass} onClick={loadPGN} type="button">
                  Load PGN
                </button>
              </div>
              {pgnError ? (
                <div className="mt-2 rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {pgnError}
                </div>
              ) : null}
              {analysisError ? (
                <div className="mt-2 rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {analysisError}
                </div>
              ) : null}
              <ul className="mt-3 space-y-2 text-sm text-slate-200" aria-live="polite">
                {engineSuggestions.length > 0 ? (
                  engineSuggestions.map((m, idx) => (
                    <li
                      key={`${m.san}-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 shadow-inner"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sky-300" aria-hidden>
                          ⚡
                        </span>
                        <span>{m.san}</span>
                      </span>
                      <span className="font-mono text-xs text-slate-300">
                        {(m.evaluation / 100).toFixed(2)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs italic text-slate-400">
                    Run analysis to reveal tactical ideas.
                  </li>
                )}
              </ul>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
                <span aria-hidden>⚙️</span>
                <span>Options</span>
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <button className={buttonClass} onClick={flipBoard} type="button">
                  Flip to {orientation === "white" ? "Black" : "White"} view
                </button>
                <button className={buttonClass} onClick={toggleArrows} type="button">
                  {showArrows ? "Hide Arrows" : "Show Arrows"}
                </button>
                <button className={buttonClass} onClick={togglePieces} type="button">
                  {pieceSet === "sprites" ? "Use Unicode" : "Use SVG Pieces"}
                </button>
                <button className={buttonClass} onClick={toggleHints} type="button">
                  {showHints ? "Hide Mate-in-1" : "Show Mate-in-1"}
                </button>
                <button
                  className={buttonClass}
                  onClick={toggleCoordinates}
                  type="button"
                >
                  {showCoordinates ? "Hide Coordinates" : "Show Coordinates"}
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
