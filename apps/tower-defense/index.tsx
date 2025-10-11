"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../../components/apps/GameLayout";
import { Overlay, useGameLoop } from "../../components/apps/Games/common";
import DpsCharts from "../games/tower-defense/components/DpsCharts";
import RangeUpgradeTree from "../games/tower-defense/components/RangeUpgradeTree";
import {
  ENEMY_TYPES,
  Tower,
  upgradeTower,
  Enemy,
  createEnemyPool,
  spawnEnemy,
  type WaveConfig,
  type WaveRuntimeState,
  createWaveRuntime,
  armWaveCountdown,
  stepWaveRuntime,
  getHighScore,
  updateHighScore,
} from "../games/tower-defense";

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

type Vec = { x: number; y: number };

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const computeFlowField = (
  start: Vec,
  goal: Vec,
  towers: Tower[],
): Vec[][] | null => {
  const obstacle = new Set(towers.map((t) => `${t.x},${t.y}`));
  const h = (a: Vec) => Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
  const key = (p: Vec) => `${p.x},${p.y}`;
  const open: (Vec & { f: number })[] = [{ ...start, f: h(start) }];
  const came = new Map<string, string>();
  const g = new Map<string, number>();
  g.set(key(start), 0);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) break;
    for (const d of DIRS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= GRID_SIZE ||
        ny >= GRID_SIZE ||
        obstacle.has(key({ x: nx, y: ny }))
      )
        continue;
      const nk = key({ x: nx, y: ny });
      const tentative = (g.get(key(current)) ?? 0) + 1;
      if (tentative < (g.get(nk) ?? Infinity)) {
        came.set(nk, key(current));
        g.set(nk, tentative);
        const f = tentative + h({ x: nx, y: ny });
        const existing = open.find((o) => o.x === nx && o.y === ny);
        if (existing) existing.f = f;
        else open.push({ x: nx, y: ny, f });
      }
    }
  }
  if (!came.has(key(goal))) return null;
  const field: Vec[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ x: 0, y: 0 })),
  );
  let cur = key(goal);
  while (cur !== key(start)) {
    const prev = came.get(cur);
    if (!prev) break;
    const [cx, cy] = cur.split(",").map(Number);
    const [px, py] = prev.split(",").map(Number);
    field[px][py] = { x: cx - px, y: cy - py };
    cur = prev;
  }
  return field;
};

interface EnemyInstance extends Enemy {
  pathIndex: number;
  progress: number;
}

const SOUND_KEY = "tower-defense:muted";

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(true);
  const [path, setPath] = useState<Vec[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const pathRef = useRef<Vec[]>([]);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const enemiesRef = useRef<EnemyInstance[]>([]);
  const enemyPool = useRef(createEnemyPool(50));
  const enemyIdRef = useRef(0);
  const damageNumbersRef = useRef<
    {
      x: number;
      y: number;
      value: number;
      life: number;
    }[]
  >([]);
  const damageTicksRef = useRef<{ x: number; y: number; life: number }[]>([]);
  const flowFieldRef = useRef<Vec[][] | null>(null);

  const [waveConfig, setWaveConfig] = useState<WaveConfig>([
    Array(5).fill("fast") as (keyof typeof ENEMY_TYPES)[],
  ]);
  const waveStateRef = useRef<WaveRuntimeState>(createWaveRuntime(waveConfig));
  useEffect(() => {
    waveStateRef.current.waves = waveConfig;
  }, [waveConfig]);

  const [waveJson, setWaveJson] = useState("");
  useEffect(() => {
    setWaveJson(JSON.stringify(waveConfig, null, 2));
  }, [waveConfig]);

  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
  const [currentWave, setCurrentWave] = useState(1);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState(() => getHighScore());
  const highScoreRef = useRef(highScore);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SOUND_KEY) === "1";
    } catch {
      return false;
    }
  });
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SOUND_KEY, muted ? "1" : "0");
    } catch {
      // ignore persistence errors
    }
  }, [muted]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playShot = useCallback(() => {
    if (mutedRef.current || typeof window === "undefined") return;
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 440 + Math.random() * 120;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // ignore audio errors
    }
  }, []);

  const [paused, setPaused] = useState(false);

  const updateCountdown = useCallback((value: number | null) => {
    const display = value !== null ? Math.max(0, Math.ceil(value)) : null;
    setCountdownDisplay((prev) => (prev === display ? prev : display));
  }, []);

  const updateScore = useCallback(
    (kills: number) => {
      if (kills <= 0) return;
      const next = scoreRef.current + kills;
      scoreRef.current = next;
      setScore(next);
      if (next > highScoreRef.current) {
        const newHigh = updateHighScore(next);
        highScoreRef.current = newHigh;
        setHighScore(newHigh);
      }
    },
    [],
  );

  const spawnEnemyOfType = useCallback(
    (type: keyof typeof ENEMY_TYPES) => {
      const currentPath = pathRef.current;
      if (!currentPath.length) return;
      const spec = ENEMY_TYPES[type];
      enemyIdRef.current += 1;
      const enemy = spawnEnemy(enemyPool.current, {
        id: enemyIdRef.current,
        x: currentPath[0].x,
        y: currentPath[0].y,
        pathIndex: 0,
        progress: 0,
        health: spec.health,
        resistance: 0,
        baseSpeed: spec.speed,
        slow: null,
        dot: null,
        type,
      });
      if (enemy) {
        enemiesRef.current.push(enemy as EnemyInstance);
      }
    },
    [],
  );

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = "#555";
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,0,0.2)";
    path.forEach((c) => {
      ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = "yellow";
      ctx.strokeRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    ctx.fillStyle = "blue";
    towers.forEach((t, i) => {
      ctx.beginPath();
      ctx.arc(
        t.x * CELL_SIZE + CELL_SIZE / 2,
        t.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (selected === i || hovered === i) {
        ctx.strokeStyle = "yellow";
        ctx.beginPath();
        ctx.arc(
          t.x * CELL_SIZE + CELL_SIZE / 2,
          t.y * CELL_SIZE + CELL_SIZE / 2,
          t.range * CELL_SIZE,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    });
    ctx.fillStyle = "red";
    enemiesRef.current.forEach((en) => {
      ctx.beginPath();
      ctx.arc(
        en.x * CELL_SIZE + CELL_SIZE / 2,
        en.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    damageTicksRef.current.forEach((t) => {
      ctx.strokeStyle = `rgba(255,0,0,${t.life})`;
      ctx.beginPath();
      ctx.arc(
        t.x * CELL_SIZE + CELL_SIZE / 2,
        t.y * CELL_SIZE + CELL_SIZE / 2,
        (CELL_SIZE / 2) * (1 - t.life),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    });
    damageNumbersRef.current.forEach((d) => {
      ctx.fillStyle = `rgba(255,255,255,${d.life})`;
      ctx.font = "12px sans-serif";
      ctx.fillText(
        d.value.toString(),
        d.x * CELL_SIZE + CELL_SIZE / 2,
        d.y * CELL_SIZE + CELL_SIZE / 2 - (1 - d.life) * 10,
      );
    });
  }, [hovered, path, selected, towers]);

  useEffect(() => {
    if (path.length >= 2) {
      flowFieldRef.current = computeFlowField(
        path[0],
        path[path.length - 1],
        towers,
      );
    } else {
      flowFieldRef.current = null;
    }
  }, [path, towers]);

  useEffect(() => {
    draw();
  }, [draw]);

  const updateGame = useCallback(
    (dt: number) => {
      const state = waveStateRef.current;
      const step = stepWaveRuntime(state, dt, {
        activeEnemies: enemiesRef.current.length,
      });

      if (step.spawnedTypes.length) {
        step.spawnedTypes.forEach(spawnEnemyOfType);
      }

      if (step.waveStarted) {
        setCurrentWave(step.waveStarted);
        updateCountdown(state.countdown);
      } else if (step.countdown !== undefined) {
        updateCountdown(state.countdown);
      }

      if (step.waveFinished) {
        if (step.allWavesCleared) {
          updateCountdown(null);
          setPaused(true);
          setEditing(true);
        } else {
          const nextWave = Math.min(
            state.waveIndex + 1,
            Math.max(state.waves.length, 1),
          );
          setCurrentWave(nextWave);
          updateCountdown(state.countdown);
        }
      }

      if (!state.running && state.countdown === null && step.countdown === undefined) {
        updateCountdown(null);
      }

      const field = flowFieldRef.current;
      if (field) {
        enemiesRef.current.forEach((en) => {
          const cellX = Math.floor(en.x);
          const cellY = Math.floor(en.y);
          const vec = field[cellX]?.[cellY];
          if (!vec) return;
          const stepSize = (en.baseSpeed * dt) / CELL_SIZE;
          en.x += vec.x * stepSize;
          en.y += vec.y * stepSize;
        });
      }

      const currentPath = pathRef.current;
      const goal = currentPath[currentPath.length - 1];
      let kills = 0;
      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        const reached =
          goal &&
          Math.floor(enemy.x) === goal.x &&
          Math.floor(enemy.y) === goal.y;
        const alive = enemy.health > 0 && !reached;
        if (!alive && enemy.health <= 0) {
          kills += 1;
        }
        return alive;
      });
      if (kills) {
        updateScore(kills);
      }

      towers.forEach((tower) => {
        const runtime = tower as Tower & { cool?: number };
        runtime.cool = runtime.cool ? runtime.cool - dt : 0;
        if (runtime.cool <= 0) {
          const target = enemiesRef.current.find(
            (enemy) =>
              Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range,
          );
          if (target) {
            target.health -= tower.damage;
            damageNumbersRef.current.push({
              x: target.x,
              y: target.y,
              value: tower.damage,
              life: 1,
            });
            damageTicksRef.current.push({
              x: target.x,
              y: target.y,
              life: 1,
            });
            runtime.cool = 1;
            playShot();
          }
        }
      });

      damageNumbersRef.current.forEach((d) => {
        d.y -= dt * 0.5;
        d.life -= dt * 2;
      });
      damageNumbersRef.current = damageNumbersRef.current.filter(
        (d) => d.life > 0,
      );

      damageTicksRef.current.forEach((t) => {
        t.life -= dt * 2;
      });
      damageTicksRef.current = damageTicksRef.current.filter((t) => t.life > 0);

      draw();
    },
    [draw, playShot, spawnEnemyOfType, towers, updateCountdown, updateScore],
  );

  useGameLoop(updateGame, !paused);

  const togglePath = (x: number, y: number) => {
    const key = `${x},${y}`;
    setPath((p) => {
      const set = pathSetRef.current;
      if (set.has(key)) {
        set.delete(key);
        return p.filter((c) => !(c.x === x && c.y === y));
      }
      set.add(key);
      return [...p, { x, y }];
    });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    const key = `${x},${y}`;
    if (editing) {
      togglePath(x, y);
      return;
    }
    const existing = towers.findIndex((t) => t.x === x && t.y === y);
    if (existing >= 0) {
      setSelected(existing);
      return;
    }
    if (pathSetRef.current.has(key)) return;
    setTowers((ts) => [...ts, { x, y, range: 1, damage: 1, level: 1 }]);
  };

  const handleCanvasMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    const idx = towers.findIndex((t) => t.x === x && t.y === y);
    setHovered(idx >= 0 ? idx : null);
  };

  const handleCanvasLeave = () => setHovered(null);

  const addWave = () => setWaveConfig((w) => [...w, []]);

  const addEnemyToWave = (
    index: number,
    type: keyof typeof ENEMY_TYPES,
  ) => {
    setWaveConfig((w) => {
      const copy = w.map((wave) => [...wave]);
      copy[index].push(type);
      return copy;
    });
  };

  const importWaves = () => {
    try {
      const data = JSON.parse(waveJson) as WaveConfig;
      if (Array.isArray(data)) setWaveConfig(data);
    } catch {
      alert("Invalid wave JSON");
    }
  };

  const exportWaves = () => {
    const json = JSON.stringify(waveConfig, null, 2);
    setWaveJson(json);
    navigator.clipboard
      ?.writeText(json)
      .catch(() => {});
  };

  const resetGame = useCallback(() => {
    waveStateRef.current = createWaveRuntime(waveConfig);
    enemiesRef.current = [];
    damageNumbersRef.current = [];
    damageTicksRef.current = [];
    setEditing(true);
    setPaused(true);
    scoreRef.current = 0;
    setScore(0);
    updateCountdown(null);
    setCurrentWave(1);
  }, [updateCountdown, waveConfig]);

  const startGame = useCallback(() => {
    if (!pathRef.current.length || !waveConfig.length) return;
    enemiesRef.current = [];
    damageNumbersRef.current = [];
    damageTicksRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    waveStateRef.current = createWaveRuntime(waveConfig);
    armWaveCountdown(waveStateRef.current);
    updateCountdown(waveStateRef.current.countdown);
    setCurrentWave(1);
    setEditing(false);
    setPaused(false);
  }, [updateCountdown, waveConfig]);

  const upgrade = (type: "range" | "damage") => {
    if (selected === null) return;
    setTowers((ts) => {
      const t = { ...ts[selected] };
      upgradeTower(t, type);
      const arr = [...ts];
      arr[selected] = t;
      return arr;
    });
  };

  return (
    <GameLayout
      gameId="tower-defense"
      stage={currentWave}
      score={score}
      highScore={highScore}
    >
      <Overlay
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
        onReset={resetGame}
        muted={muted}
        onToggleSound={setMuted}
      />
      <div className="p-2 space-y-2">
        {countdownDisplay !== null && (
          <div className="text-center bg-gray-700 text-white py-1 rounded">
            Wave {currentWave} in {countdownDisplay}
          </div>
        )}
        <div className="space-x-2 mb-2">
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Finish Editing" : "Edit Map"}
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={startGame}
            disabled={paused === false && waveStateRef.current.running}
          >
            Start
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={resetGame}
          >
            Reset
          </button>
        </div>
        <div className="space-y-1 mb-2 text-xs">
          {waveConfig.map((wave, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span>
                Wave {i + 1}: {wave.join(", ") || "empty"}
              </span>
              {(
                Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[]
              ).map((t) => (
                <button
                  key={t}
                  className="bg-gray-700 px-1 rounded"
                  onClick={() => addEnemyToWave(i, t)}
                >
                  +{t}
                </button>
              ))}
            </div>
          ))}
          <button
            className="bg-gray-700 text-xs px-2 py-1 rounded"
            onClick={addWave}
          >
            Add Wave
          </button>
          <textarea
            className="w-full bg-black text-white p-1 rounded h-24"
            value={waveJson}
            onChange={(e) => setWaveJson(e.target.value)}
          />
          <div className="space-x-2">
            <button
              className="px-2 py-1 bg-gray-700 rounded"
              onClick={importWaves}
            >
              Import
            </button>
            <button
              className="px-2 py-1 bg-gray-700 rounded"
              onClick={exportWaves}
            >
              Export
            </button>
          </div>
        </div>
        <div className="flex">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="bg-black"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={handleCanvasLeave}
          />
          {selected !== null && (
            <div className="ml-2 flex flex-col space-y-1 items-center">
              <RangeUpgradeTree tower={towers[selected]} />
              <button
                className="bg-gray-700 text-xs px-2 py-1 rounded"
                onClick={() => upgrade("range")}
              >
                +Range
              </button>
              <button
                className="bg-gray-700 text-xs px-2 py-1 rounded"
                onClick={() => upgrade("damage")}
              >
                +Damage
              </button>
            </div>
          )}
        </div>
        {!editing && <DpsCharts towers={towers} />}
      </div>
    </GameLayout>
  );
};

export default TowerDefense;

