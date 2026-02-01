import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { suggestMoves } from "../../games/chess/engine/wasmEngine";

const WHITE = 1;
const BLACK = -1;

const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const SIZE = 512;
const SQ = SIZE / 8;

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
  const [orientation, setOrientation] = useState(
    storedSettings.orientation ?? "white",
  );
  const [pieceSet, setPieceSet] = useState(storedSettings.pieceSet ?? "sprites");
  const [spritesReady, setSpritesReady] = useState(false);
  const [sanLog, setSanLog] = useState([]);
  const [analysisMoves, setAnalysisMoves] = useState([]);
  const [analysisDepth, setAnalysisDepth] = useState(
    storedSettings.analysisDepth ?? 2,
  );
  const [aiDepth, setAiDepth] = useState(storedSettings.aiDepth ?? 2);
  const [playerSide, setPlayerSide] = useState(
    storedSettings.playerSide ?? WHITE,
  );
  const [boardPixelSize, setBoardPixelSize] = useState(SIZE);
  const [hoverSquare, setHoverSquare] = useState(null);
  const [turnLabel, setTurnLabel] = useState("White");
  const [clockDisplay, setClockDisplay] = useState({ white: 0, black: 0 });
  const [evalScore, setEvalScore] = useState(0);
  const [displayEval, setDisplayEval] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
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
  }, []);

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

  const stopAi = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
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
  }, []);

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
        return prev + diff * 0.1;
      });
      frame = requestAnimationFrame(animate);
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
    showHints,
    sound,
  ]);

  useEffect(() => {
    if (!hasRestoredRef.current) return;
    persistSession();
  }, [persistSession, sanLog]);

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
    const clock = clockRef.current;
    clock.active = side;
    clock.lastTick = typeof performance !== "undefined" ? performance.now() : Date.now();
    clock.resumeTarget = side;
  };

  const addTrail = (from, to) => {
    const fx = (from & 7) * SQ + SQ / 2;
    const fy = (7 - (from >> 4)) * SQ + SQ / 2;
    const tx = (to & 7) * SQ + SQ / 2;
    const ty = (7 - (to >> 4)) * SQ + SQ / 2;
    trailsRef.current.push({ fx, fy, tx, ty, t: performance.now() });
  };

  const addCaptureSparks = (sq) => {
    if (reduceMotion) return;
    const cx = (sq & 7) * SQ + SQ / 2;
    const cy = (7 - (sq >> 4)) * SQ + SQ / 2;
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
  };

  const startMoveAnimation = (piece, from, to) => {
    if (reduceMotion || !piece) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    animationsRef.current.push({ piece, from, to, start: now, duration: 260 });
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

      setStatus(youWin ? "Checkmate! You win." : "Checkmate! You lose.");
      setGameOver(true);
      pausedRef.current = true;
      setPaused(true);
      advanceClock();
      clockRef.current.active = null;
      endGame(youWin ? "win" : "loss");
      return true;
    }

    if (game.isDraw()) {
      setStatus("Draw.");
      setGameOver(true);
      pausedRef.current = true;
      setPaused(true);
      advanceClock();
      clockRef.current.active = null;
      endGame("draw");
      return true;
    }

    if (game.isCheck()) {
      setStatus(
        sideRef.current === playerSideRef.current
          ? "Check! Your move."
          : "Check! AI thinking...",
      );
      return false;
    }

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

  const applyMove = (move, opts = {}) => {
    const {
      announce = true,
      triggerAi = true,
      fromSqOverride = null,
      toSqOverride = null,
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

    const ended = checkGameState(
      sideRef.current === playerSideRef.current ? "Your move" : "AI thinking...",
    );
    if (ended) {
      stopAi();
      return true;
    }

    if (triggerAi && !pausedRef.current && sideRef.current !== playerSideRef.current) {
      stopAi();
      aiTimeoutRef.current = setTimeout(() => aiMove(), reduceMotion ? 100 : 260);
    }

    return true;
  };

  const aiMove = () => {
    stopAi();
    if (pausedRef.current || gameOverRef.current) return;
    if (sideRef.current === playerSideRef.current) return;

    let chosen = null;
    try {
      const suggestions = suggestMoves(
        chessRef.current.fen(),
        aiDepthRef.current,
        1,
      );
      if (suggestions?.length) {
        chosen = findVerboseMove(suggestions[0].from, suggestions[0].to);
      }
    } catch {}

    if (!chosen) {
      const list = chessRef.current.moves({ verbose: true });
      chosen = list[Math.floor(Math.random() * list.length)];
    }

    applyMove(chosen, { announce: true, triggerAi: false });
  };

  aiMoveRef.current = aiMove;

  const resetGame = ({ autoplayAi } = { autoplayAi: true }) => {
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

    setSanLog([]);
    setAnalysisMoves([]);
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

    if (autoplayAi && playerSideRef.current === BLACK) {
      setStatus("AI thinking...");
      aiTimeoutRef.current = setTimeout(() => aiMove(), reduceMotion ? 100 : 260);
    } else {
      setStatus("Your move");
    }
  };

  useEffect(() => {
    if (skipInitialResetRef.current) {
      skipInitialResetRef.current = false;
      return;
    }
    setOrientation(playerSide === WHITE ? "white" : "black");
    resetGame({ autoplayAi: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerSide]);

  const undoMove = () => {
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
          aiTimeoutRef.current = setTimeout(() => aiMove(), reduceMotion ? 120 : 260);
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
  const flipBoard = () => {
    setHoverSquare(null);
    setOrientation((o) => (o === "white" ? "black" : "white"));
  };

  const copyMoves = () => {
    navigator.clipboard?.writeText(chessRef.current.pgn());
  };

  const loadPGNString = (pgn) => {
    if (!pgn) return;
    resetGame({ autoplayAi: false });

    if (!safeLoadPgn(chessRef.current, pgn)) {
      alert("Invalid PGN");
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
    reader.onload = () => loadPGNString(reader.result);
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadPGN = () => {
    pgnInputRef.current?.click();
  };

  const runAnalysis = () => {
    const suggestions = suggestMoves(chessRef.current.fen(), analysisDepth, 5);
    setAnalysisMoves(suggestions);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const render = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();

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
          const x = f * SQ;
          const y = (7 - r) * SQ;
          const light = (r + f) % 2 === 0;
          const dx = f - 3.5;
          const dy = r - 3.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ambient = Math.max(0, 1 - dist / 4.2);
          if (light) {
            const tone = Math.round(224 + ambient * 22);
            ctx.fillStyle = `rgb(${tone},${tone},${tone + 6})`;
          } else {
            const base = Math.round(58 + ambient * 45);
            ctx.fillStyle = `rgb(${base},${base + 8},${base + 22})`;
          }
          ctx.fillRect(x, y, SQ, SQ);

          const sheen = ctx.createLinearGradient(x, y, x, y + SQ);
          sheen.addColorStop(0, "rgba(255,255,255,0.08)");
          sheen.addColorStop(1, "rgba(0,0,0,0.18)");
          ctx.fillStyle = sheen;
          ctx.fillRect(x, y, SQ, SQ);

          const sq = r * 16 + f;
          if (
            lastMoveRef.current &&
            (sq === lastMoveRef.current.from || sq === lastMoveRef.current.to)
          ) {
            ctx.strokeStyle = "rgba(255, 217, 102, 0.9)";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y + 1.5, SQ - 3, SQ - 3);
          }

          if (selected === sq) {
            ctx.strokeStyle = "rgba(102, 204, 255, 0.9)";
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 2, y + 2, SQ - 4, SQ - 4);
          } else {
            const move = moves.find((m) => m.toSq === sq);
            if (move) {
              ctx.strokeStyle = "rgba(102, 204, 255, 0.7)";
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 4, y + 4, SQ - 8, SQ - 8);
            }
          }

          if (cursor === sq) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 3, y + 3, SQ - 6, SQ - 6);
          }

          if (mateSquares.includes(sq)) {
            ctx.beginPath();
            ctx.arc(x + SQ / 2, y + SQ / 2, SQ / 6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(64, 160, 255, 0.45)";
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
            highlight.addColorStop(0, "rgba(255,255,255,0.35)");
            highlight.addColorStop(1, "rgba(255,213,128,0.18)");
            ctx.fillStyle = highlight;
            ctx.fillRect(x, y, SQ, SQ);
            ctx.strokeStyle = "rgba(255, 223, 128, 0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, SQ - 2, SQ - 2);
          }

          const piece = boardRef.current[sq];
          if (piece && !suppressedSquares.has(sq)) {
            const img = spritesRef.current[String(piece)];
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
              ctx.fillStyle = piece > 0 ? "#111" : "#f8f8f8";
              ctx.fillText(pieceUnicode[String(piece)], x + SQ / 2, y + SQ / 2);
            }
          }
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
        const fromX = fromFile * SQ;
        const fromY = (7 - fromRank) * SQ;
        const toX = toFile * SQ;
        const toY = (7 - toRank) * SQ;
        const drawX = fromX + (toX - fromX) * eased;
        const drawY = fromY + (toY - fromY) * eased;
        const img = spritesRef.current[String(anim.piece)];
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
          ctx.fillStyle = anim.piece > 0 ? "#111" : "#f8f8f8";
          ctx.fillText(pieceUnicode[String(anim.piece)], drawX + SQ / 2, drawY + SQ / 2);
        }
      }

      animationsRef.current = activeAnimations;
      requestAnimationFrame(render);
    };
    const frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [cursor, hoverSquare, mateSquares, moves, pieceSet, reduceMotion, selected, showArrows, spritesReady]);

  const handleSquare = (sq) => {
    if (pausedRef.current || gameOverRef.current) return;
    if (sideRef.current !== playerSideRef.current) return;

    setCursor(sq);
    const side = sideRef.current;

    if (selected !== null) {
      const legal = moves.find((m) => m.toSq === sq);
      if (legal) {
        applyMove(legal, { announce: true, triggerAi: true });
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
    if (pausedRef.current || gameOverRef.current) return;
    if (sideRef.current !== playerSideRef.current) return;
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

  const buttonClass =
    "rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 font-semibold uppercase tracking-wide text-slate-200 transition-colors duration-150 hover:border-sky-400 hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-sky-400";

  return (
    <div className="h-full w-full select-none bg-ub-cool-grey p-2 text-white">
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
                aria-describedby="chess-board-instructions"
                className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-black shadow-[0_30px_60px_rgba(0,0,0,0.45)] outline-none transition-transform duration-500 ease-out focus:ring-2 focus:ring-sky-400"
                style={{
                  width: boardPixelSize,
                  height: boardPixelSize,
                  transform:
                    orientation === "white" ? "rotate(0deg)" : "rotate(180deg)",
                }}
              />
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
            <button className={buttonClass} onClick={() => resetGame()} type="button">
              Reset
            </button>
            <button className={buttonClass} onClick={undoMove} type="button">
              Undo
            </button>
            <button className={buttonClass} onClick={togglePause} type="button">
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
                >
                  {[1, 2, 3, 4].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs text-slate-400">
                Changing sides restarts the game. The AI moves first when you choose Black.
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
                <button className={buttonClass} onClick={runAnalysis} type="button">
                  Analyze
                </button>
                <button className={buttonClass} onClick={copyMoves} type="button">
                  Copy PGN
                </button>
                <button className={buttonClass} onClick={loadPGN} type="button">
                  Load PGN
                </button>
              </div>
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
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ChessGame;
