import React, { useEffect, useRef, useState } from "react";
import Player from "./Player";
import Ghost, { GhostMode } from "./Ghost";
import Maze from "./Maze";
import Editor from "./editor";

const Pacman: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maze, setMaze] = useState<Maze | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const animRef = useRef<number>(0);
  const [mode, setMode] = useState<GhostMode>("scatter");
  const modeTimer = useRef(0);
  const modeIndex = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const pelletCount = useRef(0);
  const recordRef = useRef<
    { p: { x: number; y: number }; g: { x: number; y: number }[] }[]
  >([]);
  const [replayData, setReplayData] = useState<
    { p: { x: number; y: number }; g: { x: number; y: number }[] }[] | null
  >(null);

  useEffect(() => {
    const hs = Number(localStorage.getItem("pacmanHighScore") || "0");
    setHighScore(hs);
    Maze.load("default").then((m) => {
      setMaze(m);
      setPlayer(
        new Player(
          m.playerStart.x * m.tileSize + m.tileSize / 2,
          m.playerStart.y * m.tileSize + m.tileSize / 2,
        ),
      );
      setGhosts(
        m.ghosts.map(
          (g) =>
            new Ghost({
              ...g,
              x: g.x * m.tileSize + m.tileSize / 2,
              y: g.y * m.tileSize + m.tileSize / 2,
              mazeWidth: m.width,
              mazeHeight: m.height,
            }),
        ),
      );
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !maze || !player || replayData) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const schedule = [
      { mode: "scatter" as GhostMode, duration: 7 },
      { mode: "chase" as GhostMode, duration: 20 },
      { mode: "scatter" as GhostMode, duration: 7 },
      { mode: "chase" as GhostMode, duration: 20 },
      { mode: "scatter" as GhostMode, duration: 5 },
      { mode: "chase" as GhostMode, duration: 20 },
      { mode: "scatter" as GhostMode, duration: 5 },
      { mode: "chase" as GhostMode, duration: Infinity },
    ];
    const loop = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      maze.tick();
      maze.draw(ctx);
      player.update(maze);
      const eaten = maze.eat(player.x, player.y);
      if (eaten === "pellet") {
        pelletCount.current++;
        if (pelletCount.current === 10 || pelletCount.current === 50) {
          maze.spawnFruit({
            x: Math.floor(maze.width / 2),
            y: Math.floor(maze.height / 2),
            score: 100,
            timer: 60 * 10,
          });
        }
        setScore((s) => s + 10);
      } else if (eaten === "power") {
        player.powered = 60 * 6;
        setScore((s) => s + 50);
        ghosts.forEach((g) => g.frighten(60 * 6));
      } else if (eaten && typeof eaten === "object") {
        setScore((s) => s + eaten.score);
      }
      modeTimer.current++;
      if (
        modeIndex.current < schedule.length - 1 &&
        modeTimer.current > schedule[modeIndex.current].duration * 60
      ) {
        modeIndex.current++;
        modeTimer.current = 0;
      }
      const baseMode = schedule[modeIndex.current].mode;
      const frightenedActive = ghosts.some((g) => g.frightenedTimer > 0);
      const currentMode = frightenedActive ? "frightened" : baseMode;
      setMode(currentMode);
      ghosts.forEach((g) => {
        g.update(player, maze, currentMode, ghosts[0]);
        const dx = g.x - player.x;
        const dy = g.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) {
          if (player.powered > 0) {
            g.reset();
            setScore((s) => s + 200);
          } else {
            cancelAnimationFrame(animRef.current!);
            fetch("/api/pacman/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ score }),
            });
            localStorage.setItem(
              "pacmanReplay",
              JSON.stringify(recordRef.current),
            );
            return;
          }
        }
        g.draw(ctx, g.frightenedTimer > 0);
      });
      recordRef.current.push({
        p: { x: player.x, y: player.y },
        g: ghosts.map((g) => ({ x: g.x, y: g.y })),
      });
      player.draw(ctx);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current!);
  }, [maze, player, ghosts, score, replayData]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("pacmanHighScore", String(score));
    }
  }, [score, highScore]);

  useEffect(() => {
    if (!canvasRef.current || !maze || !replayData) return;
    const ctx = canvasRef.current.getContext("2d")!;
    let frame = 0;
    const play = () => {
      if (!replayData || frame >= replayData.length) {
        setReplayData(null);
        return;
      }
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      maze.draw(ctx);
      const d = replayData[frame++];
      d.g.forEach((g, i) => {
        ctx.fillStyle = ghosts[i]?.color || "red";
        ctx.beginPath();
        ctx.arc(g.x, g.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(d.p.x, d.p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      animRef.current = requestAnimationFrame(play);
    };
    animRef.current = requestAnimationFrame(play);
    return () => cancelAnimationFrame(animRef.current!);
  }, [replayData, maze, ghosts]);

  useEffect(() => {
    // simple siren using oscillator
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
      oscRef.current = audioRef.current.createOscillator();
      oscRef.current.connect(audioRef.current.destination);
      oscRef.current.start();
    }
    if (!oscRef.current) return;
    if (mode === "frightened") {
      oscRef.current.frequency.setValueAtTime(0, audioRef.current!.currentTime);
    } else if (mode === "scatter") {
      oscRef.current.frequency.setValueAtTime(
        220,
        audioRef.current!.currentTime,
      );
    } else {
      oscRef.current.frequency.setValueAtTime(
        440,
        audioRef.current!.currentTime,
      );
    }
  }, [mode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!player) return;
      switch (e.key) {
        case "ArrowUp":
          player.setDirection(0, -1);
          break;
        case "ArrowDown":
          player.setDirection(0, 1);
          break;
        case "ArrowLeft":
          player.setDirection(-1, 0);
          break;
        case "ArrowRight":
          player.setDirection(1, 0);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [player]);

  useEffect(() => {
    let sx = 0;
    let sy = 0;
    const start = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (!player) return;
      if (Math.abs(dx) > Math.abs(dy)) player.setDirection(Math.sign(dx), 0);
      else player.setDirection(0, Math.sign(dy));
    };
    const el = canvasRef.current;
    el?.addEventListener("touchstart", start);
    el?.addEventListener("touchend", end);
    return () => {
      el?.removeEventListener("touchstart", start);
      el?.removeEventListener("touchend", end);
    };
  }, [player]);

  return (
    <div className="p-4 space-y-2 select-none">
      <canvas
        ref={canvasRef}
        width={maze?.width ? maze.width * maze.tileSize : 0}
        height={maze?.height ? maze.height * maze.tileSize : 0}
        className="border"
      />
      <div className="flex space-x-2 items-center">
        <div>Score: {score}</div>
        <div>High: {highScore}</div>
        <button
          type="button"
          onClick={() => setShowEditor((s) => !s)}
          className="px-2 py-1 bg-gray-300 rounded"
        >
          {showEditor ? "Hide" : "Edit"}
        </button>
        <button
          type="button"
          onClick={() => {
            const data = localStorage.getItem("pacmanReplay");
            if (data) {
              cancelAnimationFrame(animRef.current!);
              setReplayData(JSON.parse(data));
            }
          }}
          className="px-2 py-1 bg-gray-300 rounded"
        >
          Replay
        </button>
      </div>
      {showEditor && <Editor />}
    </div>
  );
};

export default Pacman;
