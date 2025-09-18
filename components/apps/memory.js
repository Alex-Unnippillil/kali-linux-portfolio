import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import GameLayout from './GameLayout';
import { createDeck, PATTERN_THEMES, fisherYatesShuffle } from './memory_utils';
import { spring, transitionString } from '../../utils/motion';

const DEFAULT_TIME = { 2: 30, 4: 60, 6: 120 };

// Built-in theme assets that can be used by the memory game.
const BUILT_IN_THEMES = {
  icons: [
    '/themes/Yaru/apps/2048.svg',
    '/themes/Yaru/apps/car-racer.svg',
    '/themes/Yaru/apps/checkers.svg',
    '/themes/Yaru/apps/flappy-bird.svg',
    '/themes/Yaru/apps/frogger.svg',
    '/themes/Yaru/apps/memory.svg',
    '/themes/Yaru/apps/nmap-nse.svg',
    '/themes/Yaru/apps/pacman.svg',
    '/themes/Yaru/apps/pong.svg',
    '/themes/Yaru/apps/radare2.svg',
    '/themes/Yaru/apps/reversi.svg',
    '/themes/Yaru/apps/snake.svg',
    '/themes/Yaru/apps/sokoban.svg',
    '/themes/Yaru/apps/tetris.svg',
    '/themes/Yaru/apps/tictactoe.svg',
    '/themes/Yaru/apps/tower-defense.svg',
    '/themes/Yaru/apps/volatility.svg',
    '/themes/Yaru/apps/wireshark.svg',
  ],
};

/**
 * Single player memory board. This encapsulates the original memory game
 * logic and is rendered once or twice depending on the selected mode.
 */
const MemoryBoard = ({ player, themePacks, onWin }) => {
  const [size, setSize] = useState(4);
  const [timerMode, setTimerMode] = useState('countup');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [highlight, setHighlight] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [stars, setStars] = useState(3);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [best, setBest] = useState({ moves: null, time: null });
  const [announcement, setAnnouncement] = useState('');
  const [deckType, setDeckType] = useState('emoji');
  const [patternTheme, setPatternTheme] = useState('vibrant');
  const [previewTime, setPreviewTime] = useState(3);
  const [previewing, setPreviewing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [particles, setParticles] = useState([]);
  const [nudge, setNudge] = useState(false);
  const [themeName, setThemeName] = useState(Object.keys(themePacks)[0] || 'icons');

  const runningRef = useRef(false);
  const startRef = useRef(0);
  const initialTimeRef = useRef(0);
  const rafRef = useRef();
  const reduceMotion = useRef(false);
  const previewTimeout = useRef();

  const bestKey = useMemo(
    () => `game:memory:${player}:${size}:${timerMode}:best`,
    [player, size, timerMode]
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reduceMotion.current = mq.matches;
    };
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update);
    };
  }, []);

  useEffect(() => () => clearTimeout(previewTimeout.current), []);

  const beep = useCallback(() => {
    if (!sound || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 600;
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 100);
    } catch {
      // ignore audio errors
    }
  }, [sound]);

  const reset = useCallback(() => {
    clearTimeout(previewTimeout.current);
    let deck;
    const themeAssets = themePacks[themeName] || [];
    if (deckType === 'theme' && themeAssets.length) {
      const pairs = (size * size) / 2;
      const selected = themeAssets
        .slice(0, pairs)
        .map((src, i) => ({ value: i, image: src }));
      const doubled = [...selected, ...selected].map((card, index) => ({ id: index, ...card }));
      deck = fisherYatesShuffle(doubled);
    } else {
      deck = createDeck(size, deckType, patternTheme);
    }
    setCards(deck);
    const all = Array.from({ length: size * size }, (_, i) => i);
    if (previewTime > 0) {
      setFlipped(all);
      setPreviewing(true);
      previewTimeout.current = setTimeout(() => {
        setFlipped([]);
        setPreviewing(false);
      }, previewTime * 1000);
    } else {
      setFlipped([]);
      setPreviewing(false);
    }
    setMatched([]);
    setHighlight([]);
    setMoves(0);
    const initial = timerMode === 'countdown' ? (DEFAULT_TIME[size] || 60) : 0;
    setTime(initial);
    initialTimeRef.current = initial;
    setStars(3);
    setPaused(false);
    runningRef.current = false;
    startRef.current = 0;
    setAnnouncement('');
    setStreak(0);
  }, [size, deckType, timerMode, patternTheme, previewTime, themePacks, themeName]);

  useEffect(() => {
    reset();
    try {
      const raw = window.localStorage.getItem(bestKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) setBest(parsed);
      } else {
        setBest({ moves: null, time: null });
      }
    } catch {
      try {
        window.localStorage.removeItem(bestKey);
      } catch {
        // ignore storage errors
      }
    }
  }, [reset, bestKey]);

  const saveBest = useCallback(() => {
    try {
      let stored = {};
      const raw = window.localStorage.getItem(bestKey);
      if (raw) {
        try {
          stored = JSON.parse(raw) || {};
        } catch {
          window.localStorage.removeItem(bestKey);
        }
      }
      const elapsed = timerMode === 'countdown' ? initialTimeRef.current - time : time;
      const bestMoves = stored.moves != null ? Math.min(stored.moves, moves) : moves;
      const bestTime = stored.time != null ? Math.min(stored.time, elapsed) : elapsed;
      const updated = { moves: bestMoves, time: bestTime };
      const serialized = JSON.stringify(updated);
      window.localStorage.setItem(bestKey, serialized);
      setBest(updated);
    } catch {
      // ignore storage errors
    }
  }, [moves, time, bestKey, timerMode]);

  useEffect(() => {
    if (cards.length && matched.length === cards.length) {
      runningRef.current = false;
      saveBest();
      const elapsed = timerMode === 'countdown' ? initialTimeRef.current - time : time;
      setAnnouncement(`You won in ${moves} moves and ${elapsed} seconds`);
      onWin?.(player, elapsed);
    }
  }, [matched, cards.length, saveBest, moves, time, timerMode, onWin, player]);

  useEffect(() => {
    const pairs = cards.length / 2 || 1;
    if (moves <= pairs * 2) setStars(3);
    else if (moves <= pairs * 3) setStars(2);
    else setStars(1);
  }, [moves, cards.length]);

  const triggerStreakEffect = useCallback(() => {
    if (reduceMotion.current) return;
    setParticles(
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
      }))
    );
    setNudge(true);
    setPaused(true);
    setTimeout(() => setParticles([]), 300);
    setTimeout(() => setNudge(false), 150);
    setTimeout(() => setPaused(false), 150);
  }, []);

  const handleCardClick = (idx) => {
    if (
      paused ||
      previewing ||
      flipped.includes(idx) ||
      matched.includes(idx) ||
      (timerMode === 'countdown' && time <= 0)
    )
      return;
    if (!runningRef.current) {
      runningRef.current = true;
      startRef.current = performance.now();
    }
    beep();
    if (flipped.length === 0) {
      setFlipped([idx]);
    } else if (flipped.length === 1) {
      const first = flipped[0];
      const second = idx;
      const newFlipped = [first, second];
      setFlipped(newFlipped);
      setMoves((mv) => mv + 1);
      if (cards[first].value === cards[second].value) {
        setMatched([...matched, first, second]);
        setHighlight([first, second]);
        setAnnouncement('Match found');
        setStreak((s) => {
          const n = s + 1;
          if (n > 1) triggerStreakEffect();
          return n;
        });
        setTimeout(() => {
          setFlipped([]);
          setHighlight([]);
        }, reduceMotion.current ? 0 : 400);
      } else {
        setAnnouncement('No match');
        setStreak(0);
        setTimeout(() => setFlipped([]), reduceMotion.current ? 0 : 800);
      }
    }
  };

  useEffect(() => {
    const loop = (timestamp) => {
      if (runningRef.current && !paused) {
        const elapsed = Math.floor((timestamp - startRef.current) / 1000);
        if (timerMode === 'countdown') {
          const remaining = initialTimeRef.current - elapsed;
          if (remaining <= 0) {
            setTime(0);
            runningRef.current = false;
          } else {
            setTime(remaining);
          }
        } else {
          setTime(elapsed);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, timerMode]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
      <div
        className="relative mb-4"
        style={{
          width: `${size * 120}px`,
          transform: nudge ? 'translateX(2px)' : 'none',
          transition: transitionString('transform', spring({ reducedMotion: reduceMotion.current })),
        }}
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}>
          {cards.map((card, i) => {
            const isFlipped = flipped.includes(i) || matched.includes(i);
            const isHighlighted = highlight.includes(i);
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(i)}
                aria-label={isFlipped ? `Card ${card.value}` : 'Hidden card'}
                disabled={
                  flipped.includes(i) ||
                  matched.includes(i) ||
                  paused ||
                  previewing ||
                  (timerMode === 'countdown' && time <= 0)
                }
                className={`relative w-full aspect-square [perspective:600px] rounded transform ${
                  isHighlighted ? 'ring-4 ring-green-600' : ''
                } ${
                  reduceMotion.current
                    ? ''
                    : 'transition-transform motion-duration-spring motion-ease-spring'
                } ${isHighlighted && !reduceMotion.current ? 'scale-105' : ''}`}
              >
                <div
                  data-testid="card-inner"
                  className={`w-full h-full transition-transform ${
                    reduceMotion.current
                      ? ''
                      : 'motion-duration-spring motion-ease-spring'
                  } [transform-style:preserve-3d]`}
                  style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  <div className="absolute inset-0 rounded flex items-center justify-center bg-gray-700 text-white [backface-visibility:hidden]" />
                  <div
                    className={`absolute inset-0 rounded flex items-center justify-center [transform:rotateY(180deg)] [backface-visibility:hidden] ${
                      isHighlighted ? 'bg-green-500 text-black' : 'bg-white text-black'
                    } ${
                      reduceMotion.current
                        ? ''
                        : 'transition-colors motion-duration-fade motion-ease-fade'
                    }`}
                  >
                    {card.image ? (
                      <img src={card.image} alt="" className="w-3/4 h-3/4 object-contain" />
                    ) : (
                      <span className={`text-4xl ${card.color || ''}`}>{card.value}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {particles.map((p) => (
          <span
            key={p.id}
            className="pointer-events-none absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          />
        ))}
        {timerMode === 'countdown' && time <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-2xl">
            Time&apos;s up
          </div>
        )}
        {paused && time > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-2xl">
            Paused
          </div>
        )}
      </div>
      <div className="flex space-x-4 mb-2">
        <div>Time: {time}s</div>
        <div>Moves: {moves}</div>
        <div>
          Rating: {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
        </div>
        {best.moves != null && <div>Best: {best.moves}m/{best.time}s</div>}
        <div data-testid="combo-meter">Combo: {streak}</div>
      </div>
      <div className="flex space-x-2">
        <button onClick={reset} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
          Reset
        </button>
        <button
          onClick={() => setPaused((p) => !p)}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => setSound((s) => !s)}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Sound: {sound ? 'On' : 'Off'}
        </button>
        <select
          aria-label="Deck"
          value={deckType}
          onChange={(e) => setDeckType(e.target.value)}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          <option value="emoji">Emoji</option>
          <option value="pattern">Pattern</option>
          <option value="letters">Letters</option>
          <option value="theme">Theme</option>
        </select>
        {deckType === 'pattern' && (
          <select
            aria-label="Pattern theme"
            value={patternTheme}
            onChange={(e) => setPatternTheme(e.target.value)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            {Object.keys(PATTERN_THEMES).map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        )}
        {deckType === 'theme' && (
          <select
            aria-label="Theme pack"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            {Object.keys(themePacks).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Timer mode"
          value={timerMode}
          onChange={(e) => setTimerMode(e.target.value)}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          <option value="countup">Count Up</option>
          <option value="countdown">Countdown</option>
        </select>
        <select
          aria-label="Grid size"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          <option value={2}>2x2</option>
          <option value={4}>4x4</option>
          <option value={6}>6x6</option>
        </select>
        <div className="flex items-center space-x-1">
          <label htmlFor={`preview-time-${player}`} className="text-sm">
            Preview {previewTime}s
          </label>
          <input
            id={`preview-time-${player}`}
            type="range"
            min="0"
            max="10"
            step="1"
            value={previewTime}
            onChange={(e) => setPreviewTime(Number(e.target.value))}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};

// Wrapper component which can render one or two MemoryBoard instances
// and also allows downloading additional theme packs.
const Memory = () => {
  const [playerCount, setPlayerCount] = useState(1);
  const [themePacks, setThemePacks] = useState(BUILT_IN_THEMES);
  const [winner, setWinner] = useState(null);

  const handleDownloadTheme = async () => {
    const url = window.prompt('Enter theme pack URL');
    if (!url) return;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.name && Array.isArray(data.assets)) {
        setThemePacks((p) => ({ ...p, [data.name]: data.assets }));
      }
    } catch {
      // ignore errors
    }
  };

  const handleWin = (player) => {
    if (!winner) setWinner(player);
  };

  return (
    <GameLayout gameId="memory">
      <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 select-none">
        <div className="mb-4 flex space-x-2 items-center">
          <button
            onClick={() => setPlayerCount((c) => (c === 1 ? 2 : 1))}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            {playerCount === 1 ? 'Two Players' : 'One Player'}
          </button>
          <button
            onClick={handleDownloadTheme}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Download Theme Pack
          </button>
          {winner && <div className="ml-4">Winner: Player {winner}</div>}
        </div>
        <div className={`flex ${playerCount === 2 ? 'space-x-4' : ''}`}>
          {Array.from({ length: playerCount }, (_, i) => (
            <MemoryBoard
              key={i}
              player={i + 1}
              themePacks={themePacks}
              onWin={handleWin}
            />
          ))}
        </div>
      </div>
    </GameLayout>
  );
};

export default Memory;

