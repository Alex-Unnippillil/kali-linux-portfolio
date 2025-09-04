"use client";

import { useEffect, useRef, useState } from "react";
import GameLayout from "../../components/apps/GameLayout";
import DpsCharts from "../games/tower-defense/components/DpsCharts";
import RangeUpgradeTree from "../games/tower-defense/components/RangeUpgradeTree";
import { Tower, upgradeTower } from "../games/tower-defense";

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [editing, setEditing] = useState(true);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [wave, setWave] = useState(1);
  const [waveCountdown, setWaveCountdown] = useState<number | null>(null);

  const send = (msg: any, transfer?: Transferable[]) =>
    workerRef.current?.postMessage(msg, transfer || []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const worker = new Worker(new URL("./worker.ts", import.meta.url));
    workerRef.current = worker;
    const offscreen = canvasRef.current.transferControlToOffscreen();
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data.type === "state") {
        setWave(e.data.wave);
        setWaveCountdown(e.data.countdown);
      }
    };
    worker.postMessage(
      { type: "init", canvas: offscreen, path, towers },
      [offscreen],
    );
    return () => worker.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    send({ type: "path", path });
  }, [path]);

  useEffect(() => {
    send({ type: "towers", towers });
  }, [towers]);

  useEffect(() => {
    send({ type: "highlight", selected, hovered });
  }, [selected, hovered]);

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

  const start = () => {
    if (!path.length) return;
    setEditing(false);
    send({ type: "start" });
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

  return (
    <GameLayout gameId="tower-defense">
      <div className="p-2 space-y-2">
        {waveCountdown !== null && (
          <div className="text-center bg-gray-700 text-white py-1 rounded">
            Wave {wave} in {Math.ceil(waveCountdown)}
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
            disabled={waveCountdown !== null}
          >
            Start
          </button>
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

