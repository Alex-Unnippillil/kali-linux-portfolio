import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useCanvasResize from '../../hooks/useCanvasResize';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';
import GameLoop from './Games/common/loop/GameLoop';
import {
  createInitialState,
  dispatch as dispatchAction,
  getGhostY,
  getVisibleOffset,
  getVisibleRows,
  step,
} from '../../games/tetris/engine';
import {
  TETROMINO_COLORS,
  TETROMINO_COLORBLIND,
  getPieceCells,
} from '../../games/tetris/rules';

const CELL_SIZE = 16;

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const adjustColor = (hex, amount) => {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.min(255, Math.max(0, v + amount));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
};

const defaultKeys = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  down: 'ArrowDown',
  rotate: 'ArrowUp',
  rotateCCW: 'z',
  rotate180: 'x',
  drop: 'Space',
  hold: 'Shift',
  pause: 'p',
  reset: 'r',
  sound: 'm',
  settings: 's',
};

const PIECE_BY_VALUE = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isNullableNumber = (value) => value === null || isFiniteNumber(value);

const validateKeyBindings = (value) => {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(defaultKeys).every(
    (key) => typeof value[key] === 'string' && value[key].length > 0,
  );
};

const BLOCKED_BINDINGS = new Set(['alt+f4', 'ctrl+w', 'ctrl+r', 'meta+w', 'meta+r']);

const formatKeyCombo = (event) => {
  const key = event.key === ' ' || event.code === 'Space' ? 'space' : event.key.toLowerCase();
  const parts = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('meta');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey && key.length > 1) parts.push('shift');
  parts.push(key);
  return parts.join('+');
};

const Tetris = ({ windowMeta } = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const isTouch = useIsTouchDevice();
  const canvasRef = useCanvasResize(10 * CELL_SIZE, 20 * CELL_SIZE);
  const boardContainerRef = useRef(null);
  const settingsRef = useRef(null);
  const loopRef = useRef(null);
  const lastDrawRef = useRef(null);
  const focusPausedRef = useRef(false);

  const [useBag, setUseBag] = usePersistentState('tetris-use-bag', true, (value) => typeof value === 'boolean');
  const [das, setDas] = usePersistentState('tetris-das', 150, isFiniteNumber);
  const [arr, setArr] = usePersistentState('tetris-arr', 50, isFiniteNumber);
  const [sound, setSound] = usePersistentState('tetris-sound', true, (value) => typeof value === 'boolean');
  const [colorBlind, setColorBlind] = usePersistentState('tetris-color-blind', false, (value) => typeof value === 'boolean');
  const [highContrast, setHighContrast] = usePersistentState('tetris-high-contrast', false, (value) => typeof value === 'boolean');
  const [highScore, setHighScore] = usePersistentState('tetris-high-score', 0, isFiniteNumber);
  const [maxLevel, setMaxLevel] = usePersistentState('tetris-max-level', 1, isFiniteNumber);
  const [bestTime, setBestTime] = usePersistentState('tetris-best-time', null, isNullableNumber);
  const [keyBindings, setKeyBindings] = usePersistentState('tetris-keys', defaultKeys, validateKeyBindings);
  const [bindingCapture, setBindingCapture] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [clearAnimation, setClearAnimation] = useState(null);
  const [celebration, setCelebration] = useState('');
  const [tSpinMessage, setTSpinMessage] = useState('');
  const [pcMessage, setPcMessage] = useState('');
  const [finishTime, setFinishTime] = useState(null);
  const [bindingWarning, setBindingWarning] = useState('');
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const audioCtxRef = useRef(null);

  const [gameState, setGameState] = useState(() =>
    createInitialState({
      randomMode: useBag ? 'seven-bag' : 'true-random',
      dasMs: das,
      arrMs: arr,
    }),
  );


  useEffect(() => {
    setGameState((prev) =>
      dispatchAction(prev, {
        type: 'updateSettings',
        settings: {
          randomMode: useBag ? 'seven-bag' : 'true-random',
          dasMs: das,
          arrMs: arr,
        },
      }),
    );
  }, [arr, das, useBag]);

  useEffect(() => {
    setGameState((prev) => dispatchAction(prev, { type: 'setSettingsOpen', open: showSettings }));
  }, [showSettings]);

  useEffect(() => {
    setGameState((prev) => dispatchAction(prev, { type: 'setFocused', focused: isFocused }));
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused && !gameState.paused && !gameState.gameOver) {
      focusPausedRef.current = true;
      setGameState((prev) => dispatchAction(prev, { type: 'pause' }));
      return;
    }
    if (isFocused && focusPausedRef.current) {
      focusPausedRef.current = false;
      setGameState((prev) => dispatchAction(prev, { type: 'resume' }));
    }
  }, [gameState.gameOver, gameState.paused, isFocused]);

  useEffect(() => {
    if (gameState.score > highScore) setHighScore(gameState.score);
    if (gameState.level > maxLevel) setMaxLevel(gameState.level);
  }, [gameState.level, gameState.score, highScore, maxLevel, setHighScore, setMaxLevel]);

  const playSound = useCallback(
    (freq = 440, duration = 0.08) => {
      if (!sound) return;
      try {
        const ctx =
          audioCtxRef.current ||
          new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        /* ignore */
      }
    },
    [sound],
  );

  useEffect(
    () => () => {
      audioCtxRef.current?.close?.();
    },
    [],
  );

  useEffect(() => {
    if (gameState.sprintComplete && finishTime === null) {
      setFinishTime(gameState.sprintTimeMs);
      if (!bestTime || gameState.sprintTimeMs < bestTime) {
        setBestTime(gameState.sprintTimeMs);
      }
    }
    if (!gameState.sprintComplete && finishTime !== null) {
      setFinishTime(null);
    }
  }, [bestTime, finishTime, gameState.sprintComplete, gameState.sprintTimeMs, setBestTime]);

  useEffect(() => {
    if (!gameState.lastClear) return;
    setClearAnimation({
      id: gameState.lastClear.id,
      lines: gameState.lastClear.lines,
      start: performance.now(),
      progress: 0,
      isTetris: gameState.lastClear.isTetris,
      boardBefore: gameState.lastClear.boardBefore,
      perfectClear: gameState.lastClear.perfectClear,
    });
    if (gameState.lastClear.isTetris) {
      setCelebration('TETRIS!');
      setTimeout(() => setCelebration(''), 1200);
    } else {
      setCelebration('');
    }
    if (gameState.lastClear.isTSpin) {
      const label = ['T-Spin', 'T-Spin Single', 'T-Spin Double', 'T-Spin Triple'][
        gameState.lastClear.lines.length
      ];
      setTSpinMessage(label || 'T-Spin');
      setTimeout(() => setTSpinMessage(''), 1000);
    }
    if (gameState.lastClear.perfectClear) {
      setPcMessage('Perfect Clear');
      setTimeout(() => setPcMessage(''), 1200);
    }
  }, [gameState.lastClear]);

  const prevPiecesRef = useRef(gameState.stats.piecesPlaced);
  useEffect(() => {
    if (gameState.stats.piecesPlaced > prevPiecesRef.current) {
      playSound(160, 0.05);
    }
    prevPiecesRef.current = gameState.stats.piecesPlaced;
  }, [gameState.stats.piecesPlaced, playSound]);

  useEffect(() => {
    if (!gameState.lastClear) return;
    if (gameState.lastClear.isTetris) {
      playSound(880, 0.16);
      return;
    }
    if (gameState.lastClear.isTSpin) {
      playSound(740, 0.12);
      return;
    }
    if (gameState.lastClear.lines.length > 0) {
      playSound(520, 0.1);
    }
  }, [gameState.lastClear, playSound]);

  useEffect(() => {
    if (!clearAnimation) return undefined;
    let frame;
    const duration = 320;
    const stepFrame = (time) => {
      const progress = Math.min((time - clearAnimation.start) / duration, 1);
      setClearAnimation((prev) => (prev ? { ...prev, progress } : null));
      if (progress >= 1) {
        setClearAnimation(null);
        return;
      }
      frame = requestAnimationFrame(stepFrame);
    };
    frame = requestAnimationFrame(stepFrame);
    return () => cancelAnimationFrame(frame);
  }, [clearAnimation]);

  useEffect(() => {
    if (!loopRef.current) {
      loopRef.current = new GameLoop((dt) => {
        setGameState((prev) => step(prev, dt));
      });
    }
    const loop = loopRef.current;
    const isActive =
      gameState.isFocused &&
      !gameState.paused &&
      !gameState.settingsOpen &&
      !gameState.gameOver &&
      !gameState.sprintComplete;
    if (isActive) {
      loop.start();
    } else {
      loop.stop();
    }
    return () => loop.stop();
  }, [gameState.gameOver, gameState.isFocused, gameState.paused, gameState.settingsOpen, gameState.sprintComplete]);

  useEffect(() => {
    if (!showSettings) {
      boardContainerRef.current?.focus();
    } else {
      settingsRef.current?.focus();
    }
  }, [showSettings]);

  const palette = colorBlind ? TETROMINO_COLORBLIND : TETROMINO_COLORS;

  const drawBlock = useCallback(
    (ctx, x, y, color, options = {}) => {
      const { opacity = 1, shadow = true, padding = 0, outline = true } = options;
      const px = x * CELL_SIZE + padding;
      const py = y * CELL_SIZE + padding;
      const size = CELL_SIZE - padding * 2;
      const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
      gradient.addColorStop(0, adjustColor(color, highContrast ? 90 : 70));
      gradient.addColorStop(0.3, color);
      gradient.addColorStop(1, adjustColor(color, highContrast ? -90 : -70));
      ctx.save();
      ctx.globalAlpha = opacity;
      if (shadow && !highContrast) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(px, py, size, size);
      if (outline) {
        ctx.strokeStyle = adjustColor(color, highContrast ? -120 : -100);
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
        ctx.strokeStyle = adjustColor(color, highContrast ? 120 : 90);
        ctx.beginPath();
        ctx.moveTo(px + 1, py + size - 1);
        ctx.lineTo(px + size - 1, py + size - 1);
        ctx.lineTo(px + size - 1, py + 1);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,255,255,${highContrast ? 0.25 : 0.15})`;
      ctx.fillRect(px + size * 0.15, py + size * 0.15, size * 0.3, size * 0.2);
      ctx.restore();
    },
    [highContrast],
  );

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const now = performance.now();
    if (lastDrawRef.current && now - lastDrawRef.current < 12) return;
    lastDrawRef.current = now;

    const visibleOffset = getVisibleOffset(gameState);
    ctx.clearRect(0, 0, 10 * CELL_SIZE, 20 * CELL_SIZE);
    const bgGradient = ctx.createLinearGradient(0, 0, 10 * CELL_SIZE, 20 * CELL_SIZE);
    bgGradient.addColorStop(0, highContrast ? '#020617' : '#0f172a');
    bgGradient.addColorStop(1, highContrast ? '#020617' : '#111827');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 10 * CELL_SIZE, 20 * CELL_SIZE);

    ctx.save();
    ctx.strokeStyle = highContrast ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.04)';
    for (let x = 0; x <= 10; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE + 0.5, 0);
      ctx.lineTo(x * CELL_SIZE + 0.5, 20 * CELL_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= 20; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE + 0.5);
      ctx.lineTo(10 * CELL_SIZE, y * CELL_SIZE + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = highContrast ? 0.2 : 0.08;
    ctx.strokeStyle = '#0f172a';
    for (let y = 0; y < 20 * CELL_SIZE; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(10 * CELL_SIZE, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    const renderBoard = clearAnimation?.boardBefore || gameState.board;
    const visibleRows = getVisibleRows({ ...gameState, board: renderBoard });
    const progress = clearAnimation?.progress ?? 0;

    visibleRows.forEach((row, y) => {
      const boardY = y + visibleOffset;
      const clearing = clearAnimation?.lines?.includes(boardY);
      const padding = clearing ? (CELL_SIZE / 2) * Math.pow(progress, 1.2) : 0;
      const opacity = clearing ? Math.max(0, 1 - progress) : 1;
      row.forEach((cell, x) => {
        if (cell) {
          const type = PIECE_BY_VALUE[cell - 1];
          drawBlock(ctx, x, y, palette[type], {
            opacity,
            padding,
            shadow: !clearing,
          });
        }
      });
      if (clearing) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.55 - progress * 0.55);
        const sweep = ctx.createLinearGradient(0, y * CELL_SIZE, 10 * CELL_SIZE, (y + 1) * CELL_SIZE);
        sweep.addColorStop(0, 'rgba(255,255,255,0)');
        sweep.addColorStop(0.5, 'rgba(255,255,255,0.8)');
        sweep.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sweep;
        ctx.fillRect(0, y * CELL_SIZE, 10 * CELL_SIZE, CELL_SIZE);
        ctx.restore();
      }
    });

    if (!clearAnimation) {
      const ghostY = getGhostY(gameState);
      getPieceCells(gameState.active.type, gameState.active.rotation).forEach(([cx, cy]) => {
        const gx = gameState.active.x + cx;
        const gy = ghostY + cy - visibleOffset;
        if (gy >= 0) {
          drawBlock(ctx, gx, gy, palette[gameState.active.type], {
            opacity: 0.2,
            shadow: false,
            outline: false,
          });
        }
      });

      getPieceCells(gameState.active.type, gameState.active.rotation).forEach(([cx, cy]) => {
        const px = gameState.active.x + cx;
        const py = gameState.active.y + cy - visibleOffset;
        if (py >= 0) {
          drawBlock(ctx, px, py, palette[gameState.active.type]);
        }
      });
    }
  }, [canvasRef, clearAnimation, drawBlock, gameState, highContrast, palette]);

  useEffect(() => {
    draw();
  }, [draw, gameState]);

  const prettyKey = useCallback((key) => {
    if (!key) return '';
    const normalized = key.length === 1 ? key.toUpperCase() : key;
    const map = {
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowDown: '↓',
      ArrowUp: '↑',
      Space: 'Space',
      ' ': 'Space',
      Shift: 'Shift',
      Control: 'Ctrl',
      Alt: 'Alt',
      Enter: 'Enter',
      Escape: 'Esc',
    };
    return map[normalized] || normalized.toUpperCase();
  }, []);

  const actionFromKey = useCallback(
    (key, code) => {
      const entry = Object.entries(keyBindings).find(
        ([, k]) => k.toLowerCase() === key.toLowerCase() || k.toLowerCase() === code.toLowerCase(),
      );
      return entry ? entry[0] : null;
    },
    [keyBindings],
  );

  const isInputLocked =
    gameState.paused || gameState.settingsOpen || gameState.gameOver || gameState.sprintComplete;

  const handleKeyDown = useCallback(
    (event) => {
      if (!shouldHandleGameKey(event, { isFocused })) return;
      if (showSettings) return;
      const action = actionFromKey(event.key, event.code);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === 'left') {
        if (isInputLocked) return;
        setGameState((prev) => dispatchAction(prev, { type: 'startMove', dir: -1 }));
      } else if (action === 'right') {
        if (isInputLocked) return;
        setGameState((prev) => dispatchAction(prev, { type: 'startMove', dir: 1 }));
      } else if (action === 'down') {
        if (isInputLocked) return;
        setGameState((prev) => dispatchAction(prev, { type: 'softDrop', active: true }));
      } else if (action === 'rotate') {
        if (isInputLocked) return;
        setGameState((prev) => dispatchAction(prev, { type: 'rotate', dir: 'cw' }));
      } else if (action === 'rotateCCW') {
        if (isInputLocked) return;
        setGameState((prev) => dispatchAction(prev, { type: 'rotate', dir: 'ccw' }));
      } else if (action === 'rotate180') {
        if (isInputLocked) return;
        setGameState((prev) => dispatchAction(prev, { type: 'rotate', dir: '180' }));
      } else if (action === 'drop') {
        if (isInputLocked) return;
        setGameState((prev) => dispatchAction(prev, { type: 'hardDrop' }));
      } else if (action === 'hold') {
        if (isInputLocked) return;
        setGameState((prev) => dispatchAction(prev, { type: 'hold' }));
      } else if (action === 'pause') {
        setGameState((prev) => dispatchAction(prev, { type: 'togglePause' }));
      } else if (action === 'reset') {
        setGameState((prev) => dispatchAction(prev, { type: 'reset' }));
      } else if (action === 'sound') {
        setSound((prev) => !prev);
      } else if (action === 'settings') {
        setShowSettings(true);
      }
    },
    [actionFromKey, isFocused, isInputLocked, setSound, showSettings],
  );

  const handleKeyUp = useCallback(
    (event) => {
      if (!shouldHandleGameKey(event, { isFocused })) return;
      if (showSettings) return;
      const action = actionFromKey(event.key, event.code);
      if (!action) return;
      consumeGameKey(event);
      if (action === 'left') {
        setGameState((prev) => dispatchAction(prev, { type: 'stopMove', dir: -1 }));
      } else if (action === 'right') {
        setGameState((prev) => dispatchAction(prev, { type: 'stopMove', dir: 1 }));
      } else if (action === 'down') {
        setGameState((prev) => dispatchAction(prev, { type: 'softDrop', active: false }));
      }
    },
    [actionFromKey, isFocused, showSettings],
  );

  const handleTouchAction = useCallback(
    (action) => {
      if (isInputLocked) return;
      if (action === 'left') {
        setGameState((prev) => dispatchAction(prev, { type: 'startMove', dir: -1 }));
        setGameState((prev) => dispatchAction(prev, { type: 'stopMove', dir: -1 }));
      } else if (action === 'right') {
        setGameState((prev) => dispatchAction(prev, { type: 'startMove', dir: 1 }));
        setGameState((prev) => dispatchAction(prev, { type: 'stopMove', dir: 1 }));
      } else if (action === 'down') {
        setGameState((prev) => dispatchAction(prev, { type: 'softDrop', active: true }));
        setTimeout(() => {
          setGameState((prev) => dispatchAction(prev, { type: 'softDrop', active: false }));
        }, 160);
      } else if (action === 'rotate') {
        setGameState((prev) => dispatchAction(prev, { type: 'rotate', dir: 'cw' }));
      } else if (action === 'drop') {
        setGameState((prev) => dispatchAction(prev, { type: 'hardDrop' }));
      } else if (action === 'hold') {
        setGameState((prev) => dispatchAction(prev, { type: 'hold' }));
      } else if (action === 'pause') {
        setGameState((prev) => dispatchAction(prev, { type: 'togglePause' }));
      }
    },
    [isInputLocked],
  );

  const touchStartRef = useRef(null);
  const padStateRef = useRef({
    left: false,
    right: false,
    down: false,
    rotate: false,
    drop: false,
    hold: false,
    pause: false,
  });

  const handleTouchStart = useCallback((event) => {
    if (!isTouch) return;
    if (event.touches.length === 2) {
      event.preventDefault();
      handleTouchAction('hold');
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
  }, [handleTouchAction, isTouch]);

  const handleTouchEnd = useCallback((event) => {
    if (!isTouch || !touchStartRef.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 10 && absY < 10) {
      handleTouchAction('rotate');
      touchStartRef.current = null;
      return;
    }
    if (absX > absY && absX > 30) {
      handleTouchAction(dx > 0 ? 'right' : 'left');
    } else if (absY > 30 && dy > 0) {
      handleTouchAction('down');
    }
    touchStartRef.current = null;
  }, [handleTouchAction, isTouch]);

  const pollGamepad = useCallback(() => {
    if (typeof navigator === 'undefined') return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads.find((p) => p);
    if (!pad) {
      padStateRef.current = {
        left: false,
        right: false,
        down: false,
        rotate: false,
        drop: false,
        hold: false,
        pause: false,
      };
      return;
    }
    const left = pad.axes[0] < -0.4 || pad.buttons[14]?.pressed;
    const right = pad.axes[0] > 0.4 || pad.buttons[15]?.pressed;
    const down = pad.axes[1] > 0.4 || pad.buttons[13]?.pressed;
    const rotatePress = pad.buttons[0]?.pressed || pad.buttons[3]?.pressed || pad.buttons[5]?.pressed;
    const dropPress = pad.buttons[1]?.pressed || pad.buttons[7]?.pressed;
    const holdPress = pad.buttons[2]?.pressed || pad.buttons[4]?.pressed;
    const pausePress = pad.buttons[9]?.pressed;
    const state = padStateRef.current;

    if (pausePress && !state.pause) {
      setGameState((prev) => dispatchAction(prev, { type: 'togglePause' }));
    }

    if (isInputLocked) return;

    if (left && !state.left) setGameState((prev) => dispatchAction(prev, { type: 'startMove', dir: -1 }));
    if (right && !state.right) setGameState((prev) => dispatchAction(prev, { type: 'startMove', dir: 1 }));
    if (!left && state.left) setGameState((prev) => dispatchAction(prev, { type: 'stopMove', dir: -1 }));
    if (!right && state.right) setGameState((prev) => dispatchAction(prev, { type: 'stopMove', dir: 1 }));
    if (down !== state.down) setGameState((prev) => dispatchAction(prev, { type: 'softDrop', active: down }));

    if (rotatePress && !state.rotate) setGameState((prev) => dispatchAction(prev, { type: 'rotate', dir: 'cw' }));
    if (dropPress && !state.drop) setGameState((prev) => dispatchAction(prev, { type: 'hardDrop' }));
    if (holdPress && !state.hold) setGameState((prev) => dispatchAction(prev, { type: 'hold' }));

    padStateRef.current = {
      left,
      right,
      down,
      rotate: rotatePress,
      drop: dropPress,
      hold: holdPress,
      pause: pausePress,
    };
  }, [isInputLocked]);

  useEffect(() => {
    let raf;
    const loop = () => {
      pollGamepad();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pollGamepad]);

  useEffect(() => {
    const update = () => {
      if (typeof navigator === 'undefined') return;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      setGamepadConnected(pads.some((pad) => pad));
    };
    update();
    window.addEventListener('gamepadconnected', update);
    window.addEventListener('gamepaddisconnected', update);
    return () => {
      window.removeEventListener('gamepadconnected', update);
      window.removeEventListener('gamepaddisconnected', update);
    };
  }, []);

  const keyboardHints = useMemo(
    () => [
      { label: 'Move', keys: [keyBindings.left, keyBindings.right] },
      { label: 'Soft Drop', keys: [keyBindings.down] },
      { label: 'Hard Drop', keys: [keyBindings.drop] },
      { label: 'Rotate', keys: [keyBindings.rotate, keyBindings.rotateCCW] },
      { label: 'Hold', keys: [keyBindings.hold] },
      { label: 'Pause', keys: [keyBindings.pause] },
    ],
    [keyBindings],
  );

  const touchControls = isTouch ? (
    <div className="mt-4 grid w-full max-w-xs grid-cols-3 gap-2 text-lg">
      <div />
      <button
        type="button"
        onPointerDown={() => handleTouchAction('rotate')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Rotate"
      >
        ⟳
      </button>
      <div />
      <button
        type="button"
        onPointerDown={() => handleTouchAction('left')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Move left"
      >
        ←
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('down')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Soft drop"
      >
        ↓
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('right')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Move right"
      >
        →
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('hold')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Hold piece"
      >
        H
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('drop')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Hard drop"
      >
        ⤓
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('pause')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label={gameState.paused ? 'Resume' : 'Pause'}
      >
        {gameState.paused ? '▶' : 'Ⅱ'}
      </button>
    </div>
  ) : null;

  const bindingConflicts = useMemo(() => {
    const entries = Object.entries(keyBindings);
    const normalized = entries.map(([action, key]) => [action, key.toLowerCase()]);
    const counts = normalized.reduce((acc, [, key]) => {
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return entries.filter(([, key]) => counts[key.toLowerCase()] > 1);
  }, [keyBindings]);

  const captureBinding = useCallback(
    (event, bindingKey) => {
      if (!bindingKey) return;
      event.preventDefault();
      const combo = formatKeyCombo(event);
      if (BLOCKED_BINDINGS.has(combo)) {
        setBindingWarning('That shortcut is reserved by the browser/OS. Choose another key.');
        return;
      }
      const value = event.key === ' ' || event.code === 'Space'
        ? 'Space'
        : event.key.length === 1
          ? event.key.toLowerCase()
          : event.key;
      setBindingWarning('');
      setKeyBindings((prev) => ({ ...prev, [bindingKey]: value }));
      setBindingCapture(null);
    },
    [setKeyBindings],
  );

  const handleSettingsKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setBindingCapture(null);
      setShowSettings(false);
      return;
    }
    if (bindingCapture) {
      captureBinding(event, bindingCapture);
    }
  }, [bindingCapture, captureBinding]);

  const stats = useMemo(() => {
    const base = [
      { label: 'Score', value: gameState.score.toLocaleString() },
      { label: 'High', value: highScore.toLocaleString() },
      { label: 'Combo', value: gameState.combo > 0 ? `${gameState.combo}x` : '—' },
      { label: 'Max Combo', value: gameState.stats.maxCombo > 0 ? `${gameState.stats.maxCombo}x` : '—' },
      { label: 'Level', value: gameState.level },
      { label: 'Lines', value: gameState.mode === 'sprint' ? `${gameState.lines}/40` : gameState.lines },
      { label: 'B2B', value: gameState.b2b > 0 ? `${gameState.b2b}x` : '—' },
      { label: 'Pieces', value: gameState.stats.piecesPlaced },
      { label: 'Tetrises', value: gameState.stats.tetrises },
      { label: 'T-Spins', value: gameState.stats.tspins },
      { label: 'Max B2B', value: gameState.stats.maxB2B },
    ];
    if (gameState.mode === 'sprint') {
      base.push(
        { label: 'Time', value: `${(gameState.sprintTimeMs / 1000).toFixed(2)}s` },
        { label: 'Best', value: bestTime ? `${(bestTime / 1000).toFixed(2)}s` : '—' },
      );
    }
    return base;
  }, [bestTime, gameState, highScore]);

  const sprintProgress = useMemo(
    () => (gameState.mode === 'sprint' ? Math.min(gameState.lines / 40, 1) : 0),
    [gameState.lines, gameState.mode],
  );

  const scoreBreakdown = gameState.lastClear?.score;

  const piecePreview = (type) => {
    const cells = getPieceCells(type, 0);
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return cells.map(([x, y], index) => (
      <div
        key={`${type}-${index}`}
        className="absolute h-4 w-4 rounded-sm border border-slate-900/60 shadow-[0_4px_10px_rgba(15,23,42,0.35)]"
        style={{
          top: (y - minY) * CELL_SIZE,
          left: (x - minX) * CELL_SIZE,
          backgroundImage: `linear-gradient(135deg, ${adjustColor(palette[type], 70)}, ${adjustColor(palette[type], -60)})`,
        }}
      />
    ));
  };

  return (
    <div className="relative h-full w-full overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="relative rounded-3xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-[0_25px_70px_rgba(15,23,42,0.65)]">
            <div
              className="relative mx-auto flex w-full max-w-[320px] aspect-[10/20] justify-center focus:outline-none"
              ref={boardContainerRef}
              tabIndex={0}
              role="application"
              aria-label="Tetris board. Click or focus to enable keyboard controls."
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onClick={() => boardContainerRef.current?.focus()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <canvas
                ref={canvasRef}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/60 shadow-[0_20px_60px_rgba(15,23,42,0.7)] transition-transform duration-150"
                aria-label="Active Tetris board"
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_6px] opacity-60" />
              {gameState.lastClear?.isTetris && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,#facc15_0%,rgba(250,204,21,0.0)_55%)]" />
              )}
              {celebration && (
                <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
                  <span className="rounded-full bg-amber-400/20 px-6 py-2 text-2xl font-semibold tracking-[0.2em] text-amber-100 shadow-lg backdrop-blur">
                    {celebration}
                  </span>
                </div>
              )}
              {tSpinMessage && (
                <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
                  <span className="rounded-full bg-purple-500/20 px-4 py-2 text-xl font-semibold tracking-[0.2em] text-purple-100 shadow-lg backdrop-blur">
                    {tSpinMessage}
                  </span>
                </div>
              )}
              {pcMessage && (
                <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
                  <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-lg font-semibold tracking-[0.2em] text-emerald-100 shadow-lg backdrop-blur">
                    {pcMessage}
                  </span>
                </div>
              )}
              {gameState.combo > 1 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
                  <span className="rounded-full bg-sky-500/20 px-4 py-1 text-sm font-semibold uppercase tracking-[0.4em] text-sky-200 shadow-lg backdrop-blur">
                    {gameState.combo}x Combo
                  </span>
                </div>
              )}
              {gameState.paused && finishTime === null && !gameState.gameOver && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/85 backdrop-blur"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="tetris-paused-title"
                >
                  <div className="w-full max-w-xs space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/90 p-6 text-center shadow-2xl">
                    <h3 id="tetris-paused-title" className="text-lg font-semibold uppercase tracking-[0.4em] text-sky-400">
                      Paused
                    </h3>
                    <div className="flex flex-col gap-2 text-sm">
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                        onClick={() => setGameState((prev) => dispatchAction(prev, { type: 'togglePause' }))}
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                        onClick={() => setGameState((prev) => dispatchAction(prev, { type: 'reset' }))}
                      >
                        Restart
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                        onClick={() => setSound((prev) => !prev)}
                      >
                        {sound ? 'Mute Audio' : 'Enable Audio'}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                        onClick={() => setShowSettings(true)}
                      >
                        Control Settings
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Press {prettyKey(keyBindings.pause)} or Start to resume.</p>
                  </div>
                </div>
              )}
              {finishTime !== null && (
                <div
                  className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-slate-950/85 backdrop-blur"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="tetris-sprint-title"
                >
                  <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/95 p-6 text-center shadow-2xl">
                    <p id="tetris-sprint-title" className="text-xs uppercase tracking-[0.45em] text-sky-400">
                      Sprint Complete
                    </p>
                    <p className="text-3xl font-semibold text-white">
                      {(finishTime / 1000).toFixed(2)}s{bestTime === finishTime ? ' • PB' : ''}
                    </p>
                    <button
                      type="button"
                      className="rounded-full border border-sky-500/60 bg-sky-500/20 px-4 py-2 font-semibold text-sky-200 transition hover:border-sky-400 hover:text-white"
                      onClick={() => setGameState((prev) => dispatchAction(prev, { type: 'reset', mode: 'sprint' }))}
                    >
                      Run it back
                    </button>
                  </div>
                </div>
              )}
              {gameState.gameOver && (
                <div
                  className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-slate-950/85 backdrop-blur"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="tetris-gameover-title"
                >
                  <div className="w-full max-w-sm space-y-4 rounded-2xl border border-rose-500/40 bg-slate-900/95 p-6 text-center shadow-2xl">
                    <p id="tetris-gameover-title" className="text-xs uppercase tracking-[0.45em] text-rose-400">
                      Game Over
                    </p>
                    <p className="text-3xl font-semibold text-white">{gameState.score.toLocaleString()}</p>
                    <div className="text-xs text-slate-300">
                      <p>Lines: {gameState.lines}</p>
                      <p>Level: {gameState.level}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-rose-500/60 bg-rose-500/20 px-4 py-2 font-semibold text-rose-200 transition hover:border-rose-400 hover:text-white"
                      onClick={() => setGameState((prev) => dispatchAction(prev, { type: 'reset', mode: gameState.mode }))}
                    >
                      Restart Run
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] uppercase tracking-[0.4em] text-slate-400">
              <span>{gameState.mode === 'sprint' ? 'Sprint 40 Lines' : 'Marathon Endless'}</span>
              <span>{sound ? 'Audio On' : 'Muted'}</span>
            </div>
            {gameState.mode === 'sprint' && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                  style={{ width: `${sprintProgress * 100}%` }}
                />
              </div>
            )}
            {touchControls}
          </div>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg" aria-labelledby="piece-queue">
              <h2 id="piece-queue" className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                Piece Queue
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div aria-live="polite">
                  <p id="hold-label" className="mb-2 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                    Hold
                  </p>
                  <div
                    className="relative h-20 w-20 rounded-xl border border-slate-800/70 bg-slate-950/60"
                    aria-labelledby="hold-label"
                  >
                    {gameState.hold ? (
                      <>
                        {piecePreview(gameState.hold)}
                        <span className="sr-only">Hold piece: {gameState.hold}</span>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-600">Empty</div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Next</p>
                  <div className="space-y-2">
                    {gameState.nextQueue.slice(0, 3).map((type, i) => (
                      <div key={`${type}-${i}`} className="relative h-16 w-16 rounded-xl border border-slate-800/70 bg-slate-950/60">
                        {piecePreview(type)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg" aria-live="polite">
              <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Mission Data</h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {stats.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">{item.label}</dt>
                    <dd className="text-base font-semibold text-slate-100">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {scoreBreakdown && scoreBreakdown.total > 0 && (
                <div className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/60 p-3 text-xs text-slate-300">
                  <p className="mb-1 text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Last Clear</p>
                  <div className="flex flex-wrap gap-2">
                    <span>Base {scoreBreakdown.base}</span>
                    {scoreBreakdown.b2b > 0 && <span>B2B +{scoreBreakdown.b2b}</span>}
                    {scoreBreakdown.combo > 0 && <span>Combo +{scoreBreakdown.combo}</span>}
                    {scoreBreakdown.perfectClear > 0 && <span>Perfect +{scoreBreakdown.perfectClear}</span>}
                    <span className="font-semibold text-sky-200">Total +{scoreBreakdown.total}</span>
                  </div>
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Controls</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Keyboard</p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {keyboardHints.map((hint) => (
                      <li key={hint.label} className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">{hint.label}</span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {hint.keys.map((key, index) => (
                            <kbd
                              key={`${hint.label}-${key || index}`}
                              className="rounded bg-slate-800/80 px-2 py-1 text-[0.65rem] font-semibold text-slate-100 shadow-[0_2px_6px_rgba(15,23,42,0.4)]"
                            >
                              {prettyKey(key)}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={gamepadConnected ? '' : 'opacity-60'}>
                  <p className="mb-2 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                    Gamepad
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${
                        gamepadConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {gamepadConnected ? 'Connected' : 'Standby'}
                    </span>
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Move</span>
                      <span className="text-right font-semibold text-slate-100">D-Pad / Left Stick</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Soft Drop</span>
                      <span className="text-right font-semibold text-slate-100">Down / LS ↓</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Hard Drop</span>
                      <span className="text-right font-semibold text-slate-100">B / RT</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Rotate</span>
                      <span className="text-right font-semibold text-slate-100">A / Y / RB</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Hold</span>
                      <span className="text-right font-semibold text-slate-100">X / LB</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Pause</span>
                      <span className="text-right font-semibold text-slate-100">Start</span>
                    </li>
                  </ul>
                </div>
              </div>
              {isTouch && (
                <p className="mt-3 text-xs text-slate-400">
                  Touch: swipe left/right to move, swipe down to soft drop, tap to rotate, two-finger tap to hold.
                </p>
              )}
            </section>
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Operations</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                  onClick={() => setGameState((prev) => dispatchAction(prev, { type: 'togglePause' }))}
                >
                  {gameState.paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                  onClick={() => setSound((prev) => !prev)}
                >
                  {sound ? 'Mute Audio' : 'Enable Audio'}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                  onClick={() => setGameState((prev) => dispatchAction(prev, { type: 'reset', mode: gameState.mode }))}
                >
                  Restart
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 font-semibold transition hover:text-white ${
                    gameState.mode === 'marathon'
                      ? 'border-sky-500/60 bg-sky-500/20 text-sky-200 hover:border-sky-400'
                      : 'border-slate-700 bg-slate-800/70 text-slate-100 hover:border-slate-500'
                  }`}
                  onClick={() => setGameState((prev) => dispatchAction(prev, { type: 'reset', mode: 'marathon' }))}
                >
                  Marathon
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 font-semibold transition hover:text-white ${
                    gameState.mode === 'sprint'
                      ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200 hover:border-emerald-400'
                      : 'border-slate-700 bg-slate-800/70 text-slate-100 hover:border-slate-500'
                  }`}
                  onClick={() => setGameState((prev) => dispatchAction(prev, { type: 'reset', mode: 'sprint' }))}
                >
                  Sprint 40
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                  onClick={() => setShowSettings(true)}
                >
                  Edit Controls
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400">Audio cues, DAS, ARR, and bindings can be tuned without leaving your run.</p>
            </section>
          </aside>
        </div>
      </div>
      {showSettings && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tetris-settings-title"
          onKeyDown={handleSettingsKeyDown}
          tabIndex={-1}
          ref={settingsRef}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-2xl">
            <h2 id="tetris-settings-title" className="mb-4 text-center text-lg font-semibold uppercase tracking-[0.4em] text-sky-400">
              Control Settings
            </h2>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-2 text-sm text-slate-200">
                <label htmlFor="bag-toggle">7-Bag</label>
                <input
                  id="bag-toggle"
                  type="checkbox"
                  checked={useBag}
                  onChange={(e) => setUseBag(e.target.checked)}
                  aria-label="Toggle seven-bag randomizer"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-sm text-slate-200">
                <label htmlFor="color-blind">Color-blind palette</label>
                <input
                  id="color-blind"
                  type="checkbox"
                  checked={colorBlind}
                  onChange={(e) => setColorBlind(e.target.checked)}
                  aria-label="Toggle color blind palette"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-sm text-slate-200">
                <label htmlFor="high-contrast">High contrast</label>
                <input
                  id="high-contrast"
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  aria-label="Toggle high contrast board"
                />
              </div>
              <div className="flex flex-col gap-1 text-sm text-slate-200">
                <label htmlFor="das-range">DAS {das}ms</label>
                <input
                  id="das-range"
                  type="range"
                  min="50"
                  max="500"
                  value={das}
                  onChange={(e) => setDas(Number(e.target.value))}
                  aria-label="Adjust DAS in milliseconds"
                />
              </div>
              <div className="flex flex-col gap-1 text-sm text-slate-200">
                <label htmlFor="arr-range">ARR {arr}ms</label>
                <input
                  id="arr-range"
                  type="range"
                  min="10"
                  max="200"
                  value={arr}
                  onChange={(e) => setArr(Number(e.target.value))}
                  aria-label="Adjust ARR in milliseconds"
                />
              </div>
            </div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Key Bindings</h3>
            <p className="mb-3 text-xs text-slate-400">
              Select an action, then press a key to bind it. Press Esc to close settings.
            </p>
            {bindingWarning && (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                {bindingWarning}
              </div>
            )}
            {bindingConflicts.length > 0 && (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                Duplicate bindings detected:
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {bindingConflicts.map(([action, key]) => (
                    <li key={`${action}-${key}`}>{action} ⇢ {prettyKey(key)}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.keys(keyBindings).map((k) => {
                const isCapturing = bindingCapture === k;
                return (
                  <div key={k} className="flex flex-col gap-1 text-sm text-slate-200">
                    <span className="uppercase tracking-[0.3em] text-slate-500">{k}</span>
                    <button
                      type="button"
                      className={`rounded border px-2 py-1 text-left text-slate-100 transition focus:outline-none ${
                        isCapturing ? 'border-sky-500 bg-slate-800/80' : 'border-slate-700 bg-slate-800'
                      }`}
                      aria-label={`Set ${k} key binding`}
                      onClick={() => setBindingCapture(k)}
                    >
                      {isCapturing ? 'Press a key…' : prettyKey(keyBindings[k])}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-800/70 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                onClick={() => setKeyBindings(defaultKeys)}
              >
                Restore defaults
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-800/70 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                onClick={() => {
                  setBindingCapture(null);
                  setShowSettings(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tetris;
