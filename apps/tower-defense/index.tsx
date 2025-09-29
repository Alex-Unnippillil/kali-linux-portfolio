"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import GameLayout from "../../components/apps/GameLayout";
import DpsCharts from "../games/tower-defense/components/DpsCharts";
import RangeUpgradeTree from "../games/tower-defense/components/RangeUpgradeTree";
import {
  ENEMY_TYPES,
  Tower,
  upgradeTower,
} from "../games/tower-defense";
import {
  TowerDefenseEngine,
  TowerDefenseStatus,
  createTowerDefenseEngine,
} from "../games/tower-defense/engine";
import { canUseOffscreenRendering } from "../games/offscreen";

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

type Vec = { x: number; y: number };

type WorkerStateMessage = {
  type: "state";
  payload: {
    path: Vec[];
    towers: Tower[];
    waveConfig: (keyof typeof ENEMY_TYPES)[][];
    selected: number | null;
    hovered: number | null;
  };
};

type WorkerStartMessage = { type: "start" };
type WorkerInitMessage = {
  type: "init";
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  cellSize: number;
  gridSize: number;
  dpr: number;
};
type WorkerResizeMessage = { type: "resize"; width: number; height: number; dpr: number };

interface WorkerStatusMessage {
  type: "status";
  status: TowerDefenseStatus;
}

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const engineRef = useRef<TowerDefenseEngine | null>(null);
  const animationRef = useRef<number>();
  const [editing, setEditing] = useState(true);
  const [path, setPath] = useState<Vec[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [waveConfig, setWaveConfig] = useState<
    (keyof typeof ENEMY_TYPES)[][]
  >([Array(5).fill("fast") as (keyof typeof ENEMY_TYPES)[]]);
  const [waveJson, setWaveJson] = useState("");
  const [status, setStatus] = useState<TowerDefenseStatus>({
    wave: 1,
    totalWaves: 1,
    waveCountdown: null,
    running: false,
  });
  const [supportsWorker, setSupportsWorker] = useState(false);

  useEffect(() => {
    setWaveJson(JSON.stringify(waveConfig, null, 2));
  }, [waveConfig]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupportsWorker(canUseOffscreenRendering());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const configureCanvasSize = () => {
      canvas.style.width = `${CANVAS_SIZE}px`;
      canvas.style.height = `${CANVAS_SIZE}px`;
    };
    configureCanvasSize();

    if (supportsWorker) {
      const worker = new Worker(
        new URL("../games/tower-defense/worker.ts", import.meta.url),
      );
      workerRef.current = worker;
      const offscreen = canvas.transferControlToOffscreen();
      const initMessage: WorkerInitMessage = {
        type: "init",
        canvas: offscreen,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        cellSize: CELL_SIZE,
        gridSize: GRID_SIZE,
        dpr: window.devicePixelRatio || 1,
      };
      worker.postMessage(initMessage, [offscreen]);
      worker.onmessage = (event: MessageEvent<WorkerStatusMessage>) => {
        if (event.data?.type === "status") {
          setStatus(event.data.status);
        }
      };
      const handleResize = () => {
        const resizeMessage: WorkerResizeMessage = {
          type: "resize",
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          dpr: window.devicePixelRatio || 1,
        };
        worker.postMessage(resizeMessage);
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => {
        worker.terminate();
        window.removeEventListener("resize", handleResize);
        workerRef.current = null;
      };
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = createTowerDefenseEngine({
      cellSize: CELL_SIZE,
      gridSize: GRID_SIZE,
      onStatusChange: setStatus,
    });
    engineRef.current = engine;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${CANVAS_SIZE}px`;
      canvas.style.height = `${CANVAS_SIZE}px`;
      canvas.width = Math.floor(CANVAS_SIZE * dpr);
      canvas.height = Math.floor(CANVAS_SIZE * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    const loop = (time: number) => {
      const dt = (time - last) / 1000;
      last = time;
      engine.step(dt);
      engine.draw(ctx);
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
      engineRef.current = null;
    };
  }, [supportsWorker]);

  useEffect(() => {
    if (supportsWorker) {
      const worker = workerRef.current;
      if (!worker) return;
      const message: WorkerStateMessage = {
        type: "state",
        payload: { path, towers, waveConfig, selected, hovered },
      };
      worker.postMessage(message);
    } else {
      engineRef.current?.setConfig({
        path,
        towers,
        waveConfig,
        selected,
        hovered,
      });
    }
  }, [path, towers, waveConfig, selected, hovered, supportsWorker]);

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
      const data = JSON.parse(waveJson) as (keyof typeof ENEMY_TYPES)[][];
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

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
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

  const handleCanvasMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    const idx = towers.findIndex((t) => t.x === x && t.y === y);
    setHovered(idx >= 0 ? idx : null);
  };

  const handleCanvasLeave = () => setHovered(null);

  const start = () => {
    if (!path.length || !waveConfig.length) return;
    setEditing(false);
    if (supportsWorker) {
      const worker = workerRef.current;
      if (worker) {
        const message: WorkerStartMessage = { type: "start" };
        worker.postMessage(message);
      }
    } else {
      engineRef.current?.start();
    }
  };

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

  const statusSummary = useMemo(
    () => ({
      countdown: status.waveCountdown,
      wave: status.wave,
      running: status.running,
    }),
    [status.waveCountdown, status.wave, status.running],
  );

  return (
    <GameLayout gameId="tower-defense">
      <div className="p-2 space-y-2">
        {statusSummary.countdown !== null && (
          <div className="text-center bg-gray-700 text-white py-1 rounded">
            Wave {statusSummary.wave} in {Math.max(0, Math.ceil(statusSummary.countdown))}
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
            onClick={start}
            disabled={statusSummary.running || statusSummary.countdown !== null}
          >
            Start
          </button>
        </div>
        <div className="space-y-1 mb-2 text-xs">
          {waveConfig.map((wave, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span>
                Wave {i + 1}: {wave.join(", ") || "empty"}
              </span>
              {(Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[]).map((t) => (
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
          <button className="bg-gray-700 text-xs px-2 py-1 rounded" onClick={addWave}>
            Add Wave
          </button>
          <textarea
            className="w-full bg-black text-white p-1 rounded h-24"
            value={waveJson}
            onChange={(e) => setWaveJson(e.target.value)}
          />
          <div className="space-x-2">
            <button className="px-2 py-1 bg-gray-700 rounded" onClick={importWaves}>
              Import
            </button>
            <button className="px-2 py-1 bg-gray-700 rounded" onClick={exportWaves}>
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
