"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "../../components/apps/GameLayout";
import {
  ENEMY_LIBRARY,
  Enemy,
  GRID_SIZE,
  PATH,
  TEXTURES,
  TOWER_LIBRARY,
  Tower,
  TowerType,
  WAVE_PLAN,
  buildPathCells,
  distance,
  formatWaveNumber,
  getTowerStats,
  isBuildableCell,
  moveTowards,
  positionAlongPath,
} from "../games/tower-defense";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const generateId = () => crypto.randomUUID();

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(40);
  const [selectedType, setSelectedType] = useState<TowerType>("bolt");
  const [credits, setCredits] = useState(50);
  const [baseHealth, setBaseHealth] = useState(20);
  const [waveIndex, setWaveIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [message, setMessage] = useState("Lay towers on the neon grid to guard the base.");
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<{
    x: number;
    y: number;
    color: string;
    life: number;
    value?: number;
  }[]>([]);
  const lastTime = useRef(0);
  const spawnTimer = useRef(0);
  const spawnedCount = useRef(0);

  const pathCells = useMemo(() => buildPathCells(), []);
  const pathPoints = useMemo(() => PATH.map((p) => ({ ...p })), []);

  useEffect(() => {
    const resize = () => {
      const width = clamp(containerRef.current?.clientWidth ?? 480, 320, 760);
      const size = Math.floor(width / GRID_SIZE);
      setCellSize(size);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = size * GRID_SIZE;
        canvas.height = size * GRID_SIZE;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const reset = () => {
    towersRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    setCredits(50);
    setBaseHealth(20);
    setWaveIndex(0);
    setIsRunning(false);
    setPreparing(true);
    setMessage("Build your neon perimeter, then start the assault.");
  };

  const addTower = (x: number, y: number) => {
    const cost = TOWER_LIBRARY[selectedType].cost;
    if (credits < cost) {
      setMessage("Not enough credits — clear more waves.");
      return;
    }
    if (!isBuildableCell(x, y, pathCells)) {
      setMessage("You can only build on empty neon tiles.");
      return;
    }
    const occupied = towersRef.current.some((t) => t.x === x && t.y === y);
    if (occupied) {
      setMessage("That tile is already fortified.");
      return;
    }
    const tower: Tower = {
      id: generateId(),
      x,
      y,
      type: selectedType,
      level: 1,
      cooldown: 0,
    };
    towersRef.current = [...towersRef.current, tower];
    setCredits((c) => c - cost);
    setMessage(`${selectedType.toUpperCase()} tower deployed.`);
  };

  const upgradeTower = (id: string) => {
    const towers = towersRef.current.map((tower) => {
      if (tower.id !== id) return tower;
      const stats = getTowerStats(tower);
      const upgradeCost = Math.ceil(stats.cost * 0.6);
      if (credits < upgradeCost) {
        setMessage("Insufficient credits to upgrade.");
        return tower;
      }
      setCredits((c) => c - Math.ceil(stats.cost * 0.6));
      setMessage(`${tower.type.toUpperCase()} tower leveled up.`);
      return { ...tower, level: tower.level + 1 };
    });
    towersRef.current = towers;
  };

  const spawnEnemy = () => {
    const currentWave = WAVE_PLAN[waveIndex];
    const type = currentWave?.[spawnedCount.current];
    if (!type) return;
    const spec = ENEMY_LIBRARY[type];
    const enemy: Enemy = {
      id: generateId(),
      type,
      pathIndex: 0,
      health: spec.health,
      maxHealth: spec.health,
      speed: spec.speed,
      reward: spec.reward,
      position: { ...PATH[0] },
    };
    enemiesRef.current.push(enemy);
    spawnedCount.current += 1;
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#050e1a";
    ctx.fillRect(0, 0, GRID_SIZE * cellSize, GRID_SIZE * cellSize);
    ctx.fillStyle = ctx.createPattern(
      (() => {
        const off = document.createElement("canvas");
        off.width = off.height = 32;
        const octx = off.getContext("2d")!;
        octx.fillStyle = "#0b1f33";
        octx.fillRect(0, 0, 32, 32);
        octx.strokeStyle = "rgba(122, 240, 255, 0.18)";
        octx.lineWidth = 1;
        octx.strokeRect(0.5, 0.5, 31, 31);
        return off;
      })(),
      "repeat",
    )!;
    ctx.fillRect(0, 0, GRID_SIZE * cellSize, GRID_SIZE * cellSize);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawGrid(ctx);

    // path
    ctx.fillStyle = TEXTURES.path;
    pathCells.forEach((cell) => {
      const [x, y] = cell.split(",").map(Number);
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    });

    // towers
    towersRef.current.forEach((tower) => {
      const stats = getTowerStats(tower);
      const cx = tower.x * cellSize + cellSize / 2;
      const cy = tower.y * cellSize + cellSize / 2;
      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        6,
        cx,
        cy,
        cellSize * 0.7,
      );
      gradient.addColorStop(0, `${TOWER_LIBRARY[tower.type].color}dd`);
      gradient.addColorStop(1, `${TOWER_LIBRARY[tower.type].color}11`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `${TOWER_LIBRARY[tower.type].color}`;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        tower.x * cellSize + 6,
        tower.y * cellSize + 6,
        cellSize - 12,
        cellSize - 12,
      );
      ctx.strokeStyle = `${TOWER_LIBRARY[tower.type].color}44`;
      ctx.beginPath();
      ctx.arc(cx, cy, stats.range * cellSize, 0, Math.PI * 2);
      ctx.stroke();
    });

    // enemies
    enemiesRef.current.forEach((enemy) => {
      const { color } = ENEMY_LIBRARY[enemy.type];
      const size = cellSize * 0.35;
      const x = enemy.position.x * cellSize + cellSize / 2;
      const y = enemy.position.y * cellSize + cellSize / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // health bar
      const hpRatio = enemy.health / enemy.maxHealth;
      ctx.fillStyle = "#0a1626";
      ctx.fillRect(x - size, y - size - 8, size * 2, 6);
      ctx.fillStyle = "#6cf0c2";
      ctx.fillRect(x - size, y - size - 8, size * 2 * hpRatio, 6);
    });

    particlesRef.current.forEach((p) => {
      const px = p.x * cellSize + cellSize / 2;
      const py = p.y * cellSize + cellSize / 2 - (1 - p.life) * 8;
      ctx.globalAlpha = p.life;
      if (p.value) {
        ctx.fillStyle = p.color;
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.fillText(`-${p.value}`, px - 6, py);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, 6 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  };

  const update = (time: number) => {
    const dt = Math.min((time - lastTime.current) / 1000, 0.05);
    lastTime.current = time;

    if (isRunning) {
      const currentWave = WAVE_PLAN[waveIndex];
      spawnTimer.current += dt;
      if (
        currentWave &&
        spawnTimer.current > 1.1 &&
        spawnedCount.current < currentWave.length
      ) {
        spawnTimer.current = 0;
        spawnEnemy();
      }

      enemiesRef.current = enemiesRef.current
        .map((enemy) => {
          const targetIndex = clamp(
            enemy.pathIndex + 1,
            1,
            pathPoints.length - 1,
          );
          const targetPoint = positionAlongPath(pathPoints, targetIndex);
          const step = enemy.speed * dt * (enemy.slowTimer ? 0.65 : 1);
          const nextPosition = moveTowards(enemy.position, targetPoint, step);
          const reached = distance(nextPosition, targetPoint) < 0.01;
          const updatedEnemy: Enemy = {
            ...enemy,
            position: nextPosition,
            pathIndex: enemy.pathIndex + (reached ? 1 : 0),
            slowTimer:
              enemy.slowTimer && enemy.slowTimer - dt > 0
                ? enemy.slowTimer - dt
                : undefined,
          };
          const goal = pathPoints[pathPoints.length - 1];
          if (
            updatedEnemy.pathIndex >= pathPoints.length - 1 &&
            distance(updatedEnemy.position, goal) < 0.05
          ) {
            setBaseHealth((hp) => Math.max(0, hp - 1));
            return null;
          }
          return updatedEnemy;
        })
        .filter(Boolean) as Enemy[];

      towersRef.current = towersRef.current.map((tower) => {
        const stats = getTowerStats(tower);
        const cooldown = Math.max(0, tower.cooldown - dt);
        if (cooldown === 0) {
          const target = enemiesRef.current.find(
            (enemy) => distance(enemy.position, tower) <= stats.range,
          );
          if (target) {
            const newHealth = target.health - stats.damage;
            target.health = newHealth;
            if (tower.type === "slow") target.slowTimer = 1.2;
            if (tower.type === "pierce") {
              enemiesRef.current
                .filter((enemy) => distance(enemy.position, tower) <= stats.range)
                .forEach((extra) => {
                  if (extra.id !== target.id)
                    extra.health -= stats.damage * 0.6;
                });
            }
            particlesRef.current.push({
              x: target.position.x,
              y: target.position.y,
              color: TOWER_LIBRARY[tower.type].color,
              life: 1,
              value: Math.ceil(stats.damage),
            });
            return { ...tower, cooldown: 1 / stats.fireRate };
          }
        }
        return { ...tower, cooldown };
      });

      const defeated: Enemy[] = [];
      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        if (enemy.health <= 0) {
          defeated.push(enemy);
          return false;
        }
        return true;
      });
      if (defeated.length) {
        setCredits((c) => c + defeated.reduce((sum, e) => sum + e.reward, 0));
      }

      if (
        baseHealth <= 0 ||
        (spawnedCount.current >= (WAVE_PLAN[waveIndex]?.length ?? 0) &&
          enemiesRef.current.length === 0)
      ) {
        setIsRunning(false);
        setPreparing(true);
        spawnTimer.current = 0;
        spawnedCount.current = 0;
        if (baseHealth <= 0) {
          setMessage("Base breached. Reset to try again.");
        } else if (waveIndex < WAVE_PLAN.length - 1) {
          setWaveIndex((w) => w + 1);
          setCredits((c) => c + 12);
          setMessage("Wave cleared! Buy upgrades and launch again.");
        } else {
          setMessage("All waves repelled. Kali is secure!");
        }
      }
    }

    particlesRef.current = particlesRef.current
      .map((p) => ({ ...p, life: p.life - dt }))
      .filter((p) => p.life > 0);

    draw();
    requestAnimationFrame(update);
  };

  useEffect(() => {
    lastTime.current = performance.now();
    requestAnimationFrame(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellSize]);

  const handlePointer = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE);
    const y = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE);
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    addTower(x, y);
  };

  const startWave = () => {
    if (isRunning) return;
    if (baseHealth <= 0) return;
    if (waveIndex >= WAVE_PLAN.length) return;
    enemiesRef.current = [];
    particlesRef.current = [];
    spawnTimer.current = 0;
    spawnedCount.current = 0;
    setIsRunning(true);
    setPreparing(false);
    setMessage(`${formatWaveNumber(waveIndex + 1)} inbound. Hold the line.`);
  };

  const activeWave = WAVE_PLAN[waveIndex];
  const remaining = (activeWave?.length ?? 0) - spawnedCount.current;

  return (
    <GameLayout gameId="tower-defense">
      <div
        ref={containerRef}
        className="flex flex-col gap-4 p-3 text-[color:var(--kali-text)]"
      >
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1">
            <div
              className="overflow-hidden rounded-xl border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] shadow-kali-panel"
              style={{ backgroundImage: TEXTURES.grid }}
            >
              <canvas
                ref={canvasRef}
                className="w-full touch-pan-y select-none"
                style={{ imageRendering: "pixelated" }}
                aria-label="Tower defense battlefield"
                onPointerDown={(e) => handlePointer(e.clientX, e.clientY)}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(TOWER_LIBRARY) as TowerType[]).map((type) => {
                const tower = TOWER_LIBRARY[type];
                const selected = selectedType === type;
                return (
                  <button
                    key={type}
                    className={`flex flex-col rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] ${
                      selected
                        ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_15%,var(--kali-panel))]"
                        : "border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]"
                    }`}
                    onClick={() => setSelectedType(type)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wide text-[0.7rem]">
                        {type}
                      </span>
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: tower.color }}
                      />
                    </div>
                    <p className="text-[0.7rem] text-[color:var(--kali-text)] opacity-70">
                      {tower.damage} dmg · {tower.range.toFixed(1)}r · {tower.cost}c
                    </p>
                    <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-60">
                      Hold to place on empty neon tile.
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          <div
            className="flex w-full flex-col gap-3 rounded-xl border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-3 shadow-kali-panel lg:max-w-sm"
            style={{ backgroundImage: TEXTURES.panel }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <div className="rounded-lg border border-[color:var(--kali-border)]/60 bg-black/30 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wide text-[color:var(--kali-text)] opacity-70">
                  Base Integrity
                </p>
                <p className="text-lg font-semibold text-kali-severity-high">
                  {baseHealth} hp
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--kali-border)]/60 bg-black/30 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wide text-[color:var(--kali-text)] opacity-70">
                  Credits
                </p>
                <p className="text-lg font-semibold text-[color:var(--color-primary)]">
                  {credits}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--kali-border)]/60 bg-black/30 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wide text-[color:var(--kali-text)] opacity-70">
                  Wave
                </p>
                <p className="text-lg font-semibold text-[color:var(--kali-text)]">
                  {waveIndex + 1}/{WAVE_PLAN.length}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[color:var(--kali-border)]/60 bg-black/25 px-3 py-2 text-sm">
              <p className="font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-80">
                {formatWaveNumber(waveIndex + 1)}
              </p>
              <p className="text-[0.75rem] text-[color:var(--kali-text)] opacity-80">
                {remaining > 0 && isRunning
                  ? `${remaining} enemies inbound`
                  : preparing
                  ? "Prep phase — build or upgrade towers."
                  : "Wave cleared!"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  className="flex-1 rounded-md bg-[color:var(--color-primary)] px-3 py-2 text-sm font-semibold text-black shadow hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={startWave}
                  disabled={isRunning || baseHealth <= 0 || waveIndex >= WAVE_PLAN.length}
                >
                  {baseHealth <= 0
                    ? "Reset required"
                    : waveIndex >= WAVE_PLAN.length
                    ? "All waves cleared"
                    : isRunning
                    ? "Wave active"
                    : "Launch Wave"}
                </button>
                <button
                  className="rounded-md border border-[color:var(--kali-border)] px-3 py-2 text-sm font-semibold text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel-highlight)]"
                  onClick={reset}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-[color:var(--kali-border)]/60 bg-black/20 px-3 py-2 text-sm">
              <p className="font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-80">
                Tower Network
              </p>
              {towersRef.current.length === 0 ? (
                <p className="text-[0.75rem] text-[color:var(--kali-text)] opacity-70">
                  No defenses placed. Tap the grid to add a tower.
                </p>
              ) : (
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1 text-[0.75rem]">
                  {towersRef.current.map((tower) => {
                    const stats = getTowerStats(tower);
                    return (
                      <div
                        key={tower.id}
                        className="flex items-center justify-between rounded border border-[color:var(--kali-border)]/60 bg-[color:var(--kali-panel)]/60 px-2 py-1"
                      >
                        <div>
                          <p className="font-semibold uppercase tracking-wide text-[0.7rem]">
                            {tower.type} · Lv {tower.level}
                          </p>
                          <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-70">
                            {stats.damage.toFixed(1)} dmg · {stats.range.toFixed(1)} r · fire x{stats.fireRate.toFixed(1)}
                          </p>
                        </div>
                        <button
                          className="rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--color-primary)] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--kali-panel))]"
                          onClick={() => upgradeTower(tower.id)}
                        >
                          Upgrade
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[color:var(--kali-border)]/60 bg-[color:var(--kali-panel)]/70 px-3 py-2 text-[0.8rem] text-[color:var(--kali-text)] opacity-80">
              <p className="font-semibold text-[color:var(--color-primary)]">Console</p>
              <p>{message}</p>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
};

export default TowerDefense;
