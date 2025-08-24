import React, { useEffect, useState, useRef } from 'react';
import ReactGA from 'react-ga4';
import { defaultLevelMetas, parseLevels, loadPublicLevels, LevelMeta } from './levels';
import {
  loadLevel,
  move,
  undo as undoMove,
  redo as redoMove,
  reset as resetLevel,
  reachable,
  isSolved,
  State,
  directionKeys,
  DIRS,
} from './engine';

const CELL = 32;

const Sokoban: React.FC = () => {
  const [levels, setLevels] = useState<LevelMeta[]>(defaultLevelMetas);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<State>(() => loadLevel(defaultLevelMetas[0].lines));
  const [reach, setReach] = useState<Set<string>>(reachable(loadLevel(defaultLevelMetas[0].lines)));
  const [best, setBest] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    const c: Record<string, boolean> = {};
    defaultLevelMetas.forEach((l) => {
      c[l.id] = localStorage.getItem(`sokoban-complete-${l.id}`) === 'true';
    });
    return c;
  });
  const workerRef = useRef<Worker>();
  const [hint, setHint] = useState<(typeof directionKeys)[number] | null>(null);
  const [animate, setAnimate] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorText, setEditorText] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const pref = localStorage.getItem('sokoban-reduce-motion');
    if (pref !== null) setReduceMotion(pref === 'true');
    else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduceMotion(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('sokoban-reduce-motion', reduceMotion ? 'true' : 'false');
  }, [reduceMotion]);

  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(new URL('./solverWorker.ts', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const data = e.data as { moves?: (typeof directionKeys)[number][] };
        if (data.moves && data.moves.length) setHint(data.moves[0]);
        else setHint(null);
      };
    }
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('level');
    if (shared) {
      try {
        const lines: string[] = JSON.parse(shared);
        const meta: LevelMeta = {
          id: 'shared',
          name: 'Shared',
          difficulty: 'custom',
          lines,
        };
        setLevels([meta]);
        setIndex(0);
        const st = loadLevel(lines);
        setState(st);
        setReach(reachable(st));
        return;
      } catch (e) {
        console.error(e);
      }
    }

    loadPublicLevels().then((lvls) => {
      setLevels(lvls);
      const comp: Record<string, boolean> = {};
      lvls.forEach((l) => {
        comp[l.id] = localStorage.getItem(`sokoban-complete-${l.id}`) === 'true';
      });
      setCompleted(comp);
      const saved = localStorage.getItem('sokoban-progress');
      if (saved) {
        try {
          const prog = JSON.parse(saved);
          const idx = lvls.findIndex((l) => l.id === prog.id);
          if (idx >= 0) {
            const st = loadLevel(lvls[idx].lines);
            st.player = prog.player;
            st.boxes = new Set(prog.boxes);
            st.pushes = prog.pushes;
            st.moves = prog.moves;
            setIndex(idx);
            setState(st);
            setReach(reachable(st));
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      const st = loadLevel(lvls[0].lines);
      setIndex(0);
      setState(st);
      setReach(reachable(st));
    });
  }, []);

  useEffect(() => {
    const lvl = levels[index];
    if (!lvl) return;
    const k = `sokoban-best-${lvl.id}`;
    const b = localStorage.getItem(k);
    setBest(b ? Number(b) : null);
  }, [index, levels]);

  useEffect(() => {
    if (!animate) {
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animate]);

  const handleMove = React.useCallback(
    (dir: (typeof directionKeys)[number]) => {
      setHint(null);
      const newState = move(state, dir);
      if (newState === state) return;
      setState(newState);
      setReach(reachable(newState));
      if (newState.pushes > state.pushes) {
        ReactGA.event('push');
      }
      if (isSolved(newState)) {
        const lvl = levels[index];
        ReactGA.event('level_complete', { moves: newState.pushes });
        const bestKey = `sokoban-best-${lvl.id}`;
        const prevBest = localStorage.getItem(bestKey);
        if (!prevBest || newState.pushes < Number(prevBest)) {
          localStorage.setItem(bestKey, String(newState.pushes));
          setBest(newState.pushes);
        }
        localStorage.setItem(`sokoban-complete-${lvl.id}`, 'true');
        setCompleted((c) => ({ ...c, [lvl.id]: true }));
        const efficiency = newState.pushes / newState.moves;
        localStorage.setItem(
          `sokoban-analytics-${lvl.id}`,
          JSON.stringify({ pushes: newState.pushes, moves: newState.moves, efficiency })
        );
      }
    },
    [state, index, levels]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!directionKeys.includes(e.key as any)) return;
      e.preventDefault();
      handleMove(e.key as any);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, index, levels, handleMove]);

  useEffect(() => {
    let sx = 0;
    let sy = 0;
    const ts = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < 30) return;
      if (absX > absY) handleMove(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      else handleMove(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    };
    window.addEventListener('touchstart', ts);
    window.addEventListener('touchend', te);
    return () => {
      window.removeEventListener('touchstart', ts);
      window.removeEventListener('touchend', te);
    };
  }, [state, index, levels, handleMove]);

  const selectLevel = (i: number) => {
    const lvl = levels[i];
    const st = loadLevel(lvl.lines);
    setAnimate(false);
    setHint(null);
    setIndex(i);
    setState(st);
    setReach(reachable(st));
    ReactGA.event('level_select', { level: i, id: lvl.id });
    const b = localStorage.getItem(`sokoban-best-${lvl.id}`);
    setBest(b ? Number(b) : null);
  };

  const handleUndo = () => {
    const st = undoMove(state);
    if (st !== state) {
      setAnimate(false);
      setHint(null);
      setState(st);
      setReach(reachable(st));
      ReactGA.event('undo');
    }
  };

  const handleRedo = () => {
    const st = redoMove(state);
    if (st !== state) {
      setAnimate(false);
      setHint(null);
      setState(st);
      setReach(reachable(st));
      ReactGA.event('redo');
    }
  };

  const handleReset = () => {
    const st = resetLevel(levels[index].lines);
    setAnimate(false);
    setHint(null);
    setState(st);
    setReach(reachable(st));
  };

  const handleHint = () => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      state: {
        width: state.width,
        height: state.height,
        walls: Array.from(state.walls),
        targets: Array.from(state.targets),
        boxes: Array.from(state.boxes),
        player: state.player,
      },
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseLevels(text).map((lines, idx) => ({
      id: `custom-${idx}`,
      name: `Custom ${idx + 1}`,
      difficulty: 'custom',
      lines,
    }));
    if (parsed.length) {
      setLevels(parsed);
      const st = loadLevel(parsed[0].lines);
      setAnimate(false);
      setHint(null);
      setIndex(0);
      setState(st);
      setReach(reachable(st));
    }
  };

  const handleExport = () => {
    const lvl = levels[index];
    const blob = new Blob([lvl.lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lvl.id}.xsb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEditor = () => {
    setEditorText(levels[index].lines.join('\n'));
    setShareUrl(null);
    setEditorOpen(true);
  };

  const applyEditor = () => {
    const lines = editorText.replace(/\r/g, '').split('\n');
    setLevels((lvls) => {
      const copy = [...lvls];
      copy[index] = { ...copy[index], lines };
      return copy;
    });
    const st = loadLevel(lines);
    setAnimate(false);
    setHint(null);
    setState(st);
    setReach(reachable(st));
    setEditorOpen(false);
  };

  const shareLevel = () => {
    const lines = editorText.replace(/\r/g, '').split('\n');
    const url = `${location.origin}${location.pathname}?level=${encodeURIComponent(
      JSON.stringify(lines)
    )}`;
    setShareUrl(url);
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
  };

  const cellStyle = {
    width: CELL,
    height: CELL,
  } as React.CSSProperties;

  const hintPos = hint ? { x: state.player.x + DIRS[hint].x, y: state.player.y + DIRS[hint].y } : null;

  useEffect(() => {
    const lvl = levels[index];
    if (!lvl) return;
    localStorage.setItem(
      'sokoban-progress',
      JSON.stringify({
        id: lvl.id,
        player: state.player,
        boxes: Array.from(state.boxes),
        pushes: state.pushes,
        moves: state.moves,
      })
    );
  }, [state, index, levels]);

  return (
    <div className="p-4 space-y-2 select-none">
      <div className="flex space-x-2 mb-2">
        <select value={index} onChange={(e) => selectLevel(Number(e.target.value))}>
          {levels.map((lvl, i) => (
            <option key={lvl.id} value={i}>{`${lvl.name} (${lvl.difficulty})${
              completed[lvl.id] ? ' ✓' : ''
            }`}</option>
          ))}
        </select>
        <input
          type="file"
          accept=".txt,.sas,.xsb"
          onChange={handleFile}
          aria-label="Import level file"
        />
        <button
          type="button"
          onClick={handleExport}
          className="px-2 py-1 bg-gray-300 rounded"
          aria-label="Export current level"
        >
          Export
        </button>
        <button
          type="button"
          onClick={handleUndo}
          className="px-2 py-1 bg-gray-300 rounded"
          aria-label="Undo move"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleRedo}
          className="px-2 py-1 bg-gray-300 rounded"
          aria-label="Redo move"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-2 py-1 bg-gray-300 rounded"
          aria-label="Reset level"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleHint}
          className="px-2 py-1 bg-gray-300 rounded"
          aria-label="Get hint"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={openEditor}
          className="px-2 py-1 bg-gray-300 rounded"
          aria-label="Edit level"
        >
          Edit
        </button>
        <div className="ml-4">Moves: {state.moves}</div>
        <div>Pushes: {state.pushes}</div>
        <div>Best: {best ?? '-'}</div>
        {state.deadlocks.size > 0 && <div className="text-red-400">Deadlock!</div>}
        <label className="flex items-center space-x-1 ml-4">
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
            aria-label="Reduce motion"
          />
          <span>Reduce motion</span>
        </label>
      </div>
      <div
        className="relative bg-gray-700"
        style={{
          width: state.width * CELL,
          height: state.height * CELL,
          imageRendering: 'pixelated',
        }}
      >
        {Array.from({ length: state.height }).map((_, y) =>
          Array.from({ length: state.width }).map((_, x) => {
            const k = `${x},${y}`;
            const isWall = state.walls.has(k);
            const isTarget = state.targets.has(k);
            const isReach = reach.has(k);
            return (
              <React.Fragment key={k}>
                <div
                  className={`absolute ${isWall ? 'bg-gray-800' : 'bg-gray-600'} ${
                    isTarget ? 'ring-2 ring-yellow-400' : ''
                  }`}
                  style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                />
                {isReach && !isWall && (
                  <div
                    className="absolute bg-green-400 opacity-30"
                    style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                  />
                )}
              </React.Fragment>
            );
          })
        )}
        {hintPos && (
          <div
            className="absolute bg-yellow-300 opacity-50 pointer-events-none"
            style={{
              ...cellStyle,
              transform: `translate(${hintPos.x * CELL}px, ${hintPos.y * CELL}px)`,
            }}
          />
        )}
        {Array.from(state.boxes).map((b) => {
          const [x, y] = b.split(',').map(Number);
          const dead = state.deadlocks.has(b);
          return (
            <div
              key={b}
              className={`absolute ${
                animate && !reduceMotion ? 'transition-transform duration-100' : ''
              } ${dead ? 'bg-red-500' : 'bg-orange-400'}`}
              style={{
                ...cellStyle,
                transform: `translate(${x * CELL}px, ${y * CELL}px)`,
              }}
            />
          );
        })}
        <div
          className={`absolute bg-blue-400 ${
            animate && !reduceMotion ? 'transition-transform duration-100' : ''
          }`}
          style={{
            ...cellStyle,
            transform: `translate(${state.player.x * CELL}px, ${state.player.y * CELL}px)`,
          }}
        />
      </div>
      {editorOpen && (
        <div className="mt-2 space-y-2">
          <textarea
            className="w-full h-40 text-black p-2"
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
          />
          {shareUrl && (
            <input className="w-full text-black p-1" value={shareUrl} readOnly />
          )}
          <div className="space-x-2">
            <button
              type="button"
              onClick={applyEditor}
              className="px-2 py-1 bg-gray-300 rounded"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={shareLevel}
              className="px-2 py-1 bg-gray-300 rounded"
            >
              Share
            </button>
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="px-2 py-1 bg-gray-300 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1 w-24" aria-label="Move controls">
        <button
          className="col-start-2 bg-gray-300 rounded"
          onClick={() => handleMove('ArrowUp')}
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          className="bg-gray-300 rounded"
          onClick={() => handleMove('ArrowLeft')}
          aria-label="Move left"
        >
          ←
        </button>
        <button
          className="col-start-3 bg-gray-300 rounded"
          onClick={() => handleMove('ArrowRight')}
          aria-label="Move right"
        >
          →
        </button>
        <button
          className="col-start-2 bg-gray-300 rounded"
          onClick={() => handleMove('ArrowDown')}
          aria-label="Move down"
        >
          ↓
        </button>
      </div>
    </div>
  );
};

export default Sokoban;
