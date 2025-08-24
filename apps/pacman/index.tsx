import React, { Suspense, useEffect, useRef, useState } from "react";
import Player from "./Player";
import Ghost, { GhostMode } from "./Ghost";
import Maze from "./Maze";
const Editor = React.lazy(() => import("./editor"));
import { ModeController } from "./modes";

const Pacman: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maze, setMaze] = useState<Maze | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const animRef = useRef<number>(0);
  const [mode, setMode] = useState<GhostMode>("scatter");
  const modeCtrl = useRef(new ModeController());
  const audioRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const pelletCount = useRef(0);
  const fruitTriggers = useRef([70, 170]);
  const [crt, setCrt] = useState(false);
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
      pelletCount.current = 0;
      fruitTriggers.current = [70, 170];
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !maze || !player || replayData) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const step = 1000 / 60;
    let last = performance.now();
    let acc = 0;
    const update = () => {
      maze.tick();
      player.update(maze);
      const eaten = maze.eat(player.x, player.y);
      if (eaten === "pellet") {
        pelletCount.current++;
        if (fruitTriggers.current[0] === pelletCount.current) {
          fruitTriggers.current.shift();
          maze.spawnFruit({
            x: Math.floor(maze.width / 2),
            y: Math.floor(maze.height / 2),
            score: 100,
            timer: 60 * 10,
          });
        }
        setScore((s) => {
          const ns = s + 10;
          scoreRef.current = ns;
          return ns;
        });
      } else if (eaten === "power") {
        player.powered = 60 * 6;
        setScore((s) => {
          const ns = s + 50;
          scoreRef.current = ns;
          return ns;
        });
        ghosts.forEach((g) => g.frighten(60 * 6));
      } else if (eaten && typeof eaten === "object") {
        setScore((s) => {
          const ns = s + eaten.score;
          scoreRef.current = ns;
          return ns;
        });
      }
      const baseMode = modeCtrl.current.tick();
      const frightenedActive = ghosts.some((g) => g.frightenedTimer > 0);
      const currentMode = frightenedActive ? "frightened" : baseMode;
      setMode(currentMode);
      ghosts.forEach((g) => {
        g.update(player, maze, currentMode, ghosts[0], pelletCount.current);
        const dx = g.x - player.x;
        const dy = g.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) {
          if (player.powered > 0) {
            g.reset();
            setScore((s) => {
              const ns = s + 200;
              scoreRef.current = ns;
              return ns;
            });
          } else {
            cancelAnimationFrame(animRef.current!);
            fetch("/api/pacman/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ score: scoreRef.current }),
            });
            localStorage.setItem(
              "pacmanReplay",
              JSON.stringify(recordRef.current),
            );
            return;
          }
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      maze.draw(ctx);
      ghosts.forEach((g) => g.draw(ctx, g.frightenedTimer > 0));
      player.draw(ctx);
      recordRef.current.push({
        p: { x: player.x, y: player.y },
        g: ghosts.map((g) => ({ x: g.x, y: g.y })),
      });
    };

    const frame = (time: number) => {
      acc += time - last;
      last = time;
      while (acc >= step) {
        update();
        acc -= step;
      }
      draw();
      animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current!);
  }, [maze, player, ghosts, replayData]);

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
      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          width={maze?.width ? maze.width * maze.tileSize : 0}
          height={maze?.height ? maze.height * maze.tileSize : 0}
          className="border"
          style={crt ? { filter: "contrast(1.2) brightness(1.1)" } : undefined}
        />
        {crt && (
          <div className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-40 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_2px,rgba(0,0,0,0.3)_2px,rgba(0,0,0,0.3)_4px)]" />
        )}
      </div>
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
        <button
          type="button"
          onClick={() => setCrt((c) => !c)}
          className="px-2 py-1 bg-gray-300 rounded"
        >
          {crt ? "CRT Off" : "CRT On"}
        </button>
      </div>
      {showEditor && (
        <Suspense fallback={null}>
          <Editor />
        </Suspense>
      )}
    </div>
  );
};

export default Pacman;
