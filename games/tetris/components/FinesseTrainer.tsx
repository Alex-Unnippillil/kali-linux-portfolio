"use client";

import React, { useState, useEffect, useCallback } from "react";
import usePersistentState from "../../../hooks/usePersistentState";

const WIDTH = 10;
const HEIGHT = 20;
const CELL = 24;

const TETROMINOS: Record<string, { shape: number[][]; color: string }> = {
  I: { shape: [[1, 1, 1, 1]], color: "#06b6d4" },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: "#3b82f6" },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: "#f97316" },
  O: { shape: [[1, 1], [1, 1]], color: "#eab308" },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: "#22c55e" },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: "#a855f7" },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: "#ef4444" },
};

const PIECES = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[];

type Piece = {
  shape: number[][];
  color: string;
  x: number;
  y: number;
  type: keyof typeof TETROMINOS;
};

const createPiece = (type: keyof typeof TETROMINOS): Piece => {
  const def = TETROMINOS[type];
  return {
    shape: def.shape.map((r) => [...r]),
    color: def.color,
    x: 0,
    y: 0,
    type,
  };
};

const FinesseTrainer = () => {
  const [piece, setPiece] = useState<Piece | null>(null);
  const [spawnX, setSpawnX] = useState(0);
  const [moves, setMoves] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [stats, setStats] = usePersistentState("tetris-finesse-stats", {
    pieces: 0,
    perfect: 0,
    totalExtra: 0,
  });

  const spawn = useCallback(() => {
    const type = PIECES[Math.floor(Math.random() * PIECES.length)];
    const p = createPiece(type);
    const x = Math.floor(WIDTH / 2 - p.shape[0].length / 2);
    p.x = x;
    p.y = 0;
    setPiece(p);
    setSpawnX(x);
    setMoves(0);
  }, []);

  useEffect(() => {
    spawn();
  }, [spawn]);

  const move = useCallback((dx: number) => {
    setPiece((p) => {
      if (!p) return p;
      const newX = Math.min(
        Math.max(p.x + dx, 0),
        WIDTH - p.shape[0].length
      );
      if (newX !== p.x) setMoves((m) => m + 1);
      return { ...p, x: newX };
    });
  }, []);

  const drop = useCallback(() => {
    if (!piece) return;
    const finalX = piece.x;
    const optimal = Math.abs(finalX - spawnX);
    const extra = Math.max(0, moves - optimal);
    setFeedback(extra === 0 ? "Perfect!" : `+${extra} moves`);
    setStats((s: any) => ({
      pieces: s.pieces + 1,
      perfect: s.perfect + (extra === 0 ? 1 : 0),
      totalExtra: s.totalExtra + extra,
    }));
    spawn();
  }, [piece, spawnX, moves, spawn, setStats]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      } else if (e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move, drop]);

  const average =
    stats.pieces > 0 ? (stats.totalExtra / stats.pieces).toFixed(2) : "0";

  return (
    <div className="flex flex-col items-center text-white">
      <div className="mb-2 h-6" aria-live="polite">
        {feedback}
      </div>
      <div
        className="border border-gray-700"
        style={{ width: WIDTH * CELL, height: HEIGHT * CELL }}
      >
        {Array.from({ length: HEIGHT }).map((_, y) => (
          <div key={y} className="flex">
            {Array.from({ length: WIDTH }).map((_, x) => {
              const filled = piece && piece.shape[y - piece.y]?.[x - piece.x];
              return (
                <div
                  key={x}
                  className="border border-gray-800"
                  style={{
                    width: CELL,
                    height: CELL,
                    backgroundColor: filled ? piece!.color : undefined,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 text-sm">
        <div>Pieces: {stats.pieces}</div>
        <div>Perfect: {stats.perfect}</div>
        <div>Avg extra moves: {average}</div>
      </div>
    </div>
  );
};

export default FinesseTrainer;

