import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const {
  Engine,
  Render,
  World,
  Bodies,
  Body,
  Constraint,
  Runner,
  Composite,
} = Matter as any;

interface TableElement {
  type: 'flipper' | 'bumper' | 'slingshot' | 'lane';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
}

interface Table {
  name: string;
  elements: TableElement[];
}

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectsRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker>();
  const engineRef = useRef<any>();
  const pixiAppRef = useRef<any>();
  const lightPoolRef = useRef<any[]>([]);
  const flippersRef = useRef<any[]>([]);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [tableText, setTableText] = useState('');
  const hitsRef = useRef(0);
  const nudgesRef = useRef<number[]>([]);
  const [tilt, setTilt] = useState(false);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const bumperSound = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    const src = [
      'data:audio/wav;base64,' +
        'UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAFsrllErbrp9a34pcKVUHi8FBHPYjbHukxeDBIH1jWKoK83397UjO0vca' +
        'fl7bX/Qc4Fa' +
        'fzYLDCzgD7hzmBeFQoCIirKi5cX27+sblUQjZbt57n8BdwJgqT0FFAXo2b5hnZOHAYCTh2Gd2b4F6AUUqT0CYAF37n+7eSNllUTrG/bv5cWyooiKQoAXh' +
        'XOYD7gs4AsM' +
        'fzaBWtBzbX/5e9xpO0u1I/f3K81iqPWNBIEXg+6TjbFz2AUEHi+lVClwa366fStullFbKwAApdRqrtWRRoKVgdePW6vi0Pv7jSdzThJs6Xz8fgtynlfVM' +
        'gkIS9zFtCSW' +
        'B4STgDCMf6WByfXz1B/xR41n6Xq+f3h1Tl0bOgoQFeRru92aRYYSgP+I/p9Xwvvr+xcnQZ9ibXj/f214n2InQfsX++tXwv6f/4gSgEWG3ZpruxXkChAbO' +
        'k5deHW+f+l6' +
        'jWfxR9Qf9fOByX+lMIyTgAeEJJbFtEvcCQjVMp5XC3L8ful8EmxzTo0n+/vi0Fur14+VgUaC1ZFqrqXUAABbK5ZRK266fWt+KXClVB4vBQRz2I2x7pMXg' +
        'wSB9Y1iqCvN' +
        '9/e1IztL3Gn5e21/0HOBWn82Cwws4A+4c5gXhUKAiIqyouXF9u/rG5VEI2W7ee5/AXcCYKk9BRQF6Nm+YZ2ThwGAk4dhndm+BegFFKk9AmABd+5/u3kjZ' +
        'ZVE6xv27+XF' +
        'sqKIikKAF4VzmA+4LOALDH82gVrQc21/+XvcaTtLtSP39yvNYqj1jQSBF4Puk42xc9gFBB4vpVQpcGt+un0rbpZRWysAAKXUaq7VkUaClYHXj1ur4tD7+' +
        '40nc04SbOl8' +
        '/H4Lcp5X1TIJCEvcxbQklgeEk4AwjH+lgcn189Qf8UeNZ+l6vn94dU5dGzoKEBXka7vdmkWGEoD/iP6fV8L76/sXJ0GfYm14/39teJ9iJ0H7F/vrV8L+n' +
        '/+IEoBFht2a' +
        'a7sV5AoQGzpOXXh1vn/peo1n8UfUH/Xzgcl/pTCMk4AHhCSWxbRL3AkI1TKeVwty/H7pfBJsc06NJ/v74tBbq9ePlYFGgtWRaq6l1A==',
    ];
    import('howler').then(({ Howl }) => {
      if (!mounted) return;
      bumperSound.current = new Howl({ src });
    });
    return () => {
      mounted = false;
      bumperSound.current?.unload();
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    const width = 400;
    const height = 600;
    async function loadPixi() {
      const PIXI = await import('pixi.js');
      if (!effectsRef.current || !mounted) return;
      const app = new PIXI.Application({
        view: effectsRef.current,
        width,
        height,
        backgroundAlpha: 0,
      });
      pixiAppRef.current = app;
      lightPoolRef.current = Array.from({ length: 10 }, () => {
        const g = new PIXI.Graphics();
        g.beginFill(0xffff00);
        g.drawCircle(0, 0, 20);
        g.endFill();
        g.visible = false;
        app.stage.addChild(g);
        return g;
      });
    }
    loadPixi();
    return () => {
      mounted = false;
      pixiAppRef.current?.destroy(true);
    };
  }, []);

  useEffect(() => {
    let engine: any;
    let render: any;
    let flippers: any[] = [];
    let bumpers: any[] = [];
    const width = 400;
    const height = 600;

    async function init() {
      const params = new URLSearchParams(window.location.search);
      const tableName = params.get('table') || 'default';
      const res = await fetch(`/apps/pinball/tables/${tableName}.json`);
      const table: Table = await res.json();
      setTableText(JSON.stringify(table, null, 2));

      if (
        canvasRef.current &&
        (canvasRef.current as any).transferControlToOffscreen
      ) {
        const off = (canvasRef.current as any).transferControlToOffscreen();
        workerRef.current = new Worker(
          new URL('./worker.ts', import.meta.url)
        );
        workerRef.current.onmessage = (e) => {
          if (e.data.type === 'bumperHit') {
            onBumperHit(e.data.x, e.data.y);
          }
        };
        workerRef.current.postMessage({ canvas: off, table }, [off]);
      } else {
        engine = Engine.create();
        render = Render.create({
          canvas: canvasRef.current as HTMLCanvasElement,
          engine,
          options: { width, height, wireframes: false, background: '#111' },
        });
        World.add(engine.world, [
          Bodies.rectangle(width / 2, height, width, 20, { isStatic: true }),
          Bodies.rectangle(0, height / 2, 20, height, { isStatic: true }),
          Bodies.rectangle(width, height / 2, 20, height, { isStatic: true }),
          Bodies.rectangle(width / 2, 0, width, 20, { isStatic: true }),
        ]);
        table.elements.forEach((el) => {
          if (el.type === 'bumper') {
            const bumper = Bodies.circle(el.x, el.y, el.radius || 20, {
              isStatic: true,
              restitution: 1.2,
            });
            bumpers.push(bumper);
            World.add(engine.world, bumper);
          } else if (el.type === 'flipper') {
            const widthF = el.width || 80;
            const flipper = Bodies.rectangle(
              el.x,
              el.y,
              widthF,
              el.height || 20,
            );
            const dir = el.x < width / 2 ? -1 : 1;
            const hinge = Constraint.create({
              bodyA: flipper,
              pointA: { x: (widthF / 2) * dir, y: 0 },
              pointB: { x: el.x + (widthF / 2) * dir, y: el.y },
              length: 0,
              stiffness: 1,
            });
            flippers.push(flipper);
            World.add(engine.world, [flipper, hinge]);
          } else if (el.type === 'slingshot') {
            const sling = Bodies.polygon(el.x, el.y, 3, el.radius || 40, {
              isStatic: true,
              restitution: 1.2,
            });
            bumpers.push(sling);
            World.add(engine.world, sling);
          } else if (el.type === 'lane') {
            const lane = Bodies.rectangle(
              el.x,
              el.y,
              el.width || 100,
              el.height || 20,
              { isStatic: true, angle: el.radius || 0 },
            );
            World.add(engine.world, lane);
          }
        });
        const ball = Bodies.circle(width / 2, height - 120, 10, {
          restitution: 0.9,
        });
        World.add(engine.world, ball);
        let ballSave = true;
        setTimeout(() => (ballSave = false), 5000);
        Matter.Events.on(engine, 'afterUpdate', () => {
          if (ball.position.y > height && ballSave) {
            Body.setPosition(ball, { x: width / 2, y: height - 120 });
            Body.setVelocity(ball, { x: 0, y: -10 });
          }
        });
        Matter.Events.on(engine, 'collisionStart', (event: any) => {
          event.pairs.forEach((pair: any) => {
            if (bumpers.includes(pair.bodyA) || bumpers.includes(pair.bodyB)) {
              const p = bumpers.includes(pair.bodyA)
                ? pair.bodyA.position
                : pair.bodyB.position;
              onBumperHit(p.x, p.y);
            }
          });
        });
        const runner = Runner.create({ isFixed: true, delta: 1000 / 60 });
        Runner.run(runner, engine);
        Render.run(render);
        engineRef.current = engine;
        flippersRef.current = flippers;
        const rotateFlipper = (index: number, dir: number) => {
          const fl = flippers[index];
          if (fl) Body.applyAngularImpulse(fl, dir * 0.02);
        };
        function handleKey(e: KeyboardEvent) {
          if (tilt) return;
          if (e.code === 'ArrowLeft') rotateFlipper(0, -1);
          if (e.code === 'ArrowRight') rotateFlipper(1, 1);
          if (e.code === 'Space') nudge();
        }
        window.addEventListener('keydown', handleKey);
        function handleTouch(e: TouchEvent) {
          if (tilt) return;
          const x = e.changedTouches[0].clientX;
          if (x < window.innerWidth / 2) rotateFlipper(0, -1);
          else rotateFlipper(1, 1);
        }
        window.addEventListener('touchstart', handleTouch);
        return () => {
          window.removeEventListener('keydown', handleKey);
          window.removeEventListener('touchstart', handleTouch);
          Render.stop(render);
          Engine.clear(engine);
        };
      }
    }

    init();

    function onVisibility() {
      workerRef.current?.postMessage({
        type: 'visibility',
        hidden: document.hidden,
      });
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      workerRef.current?.terminate();
    };
  }, [tilt]);

  function rotate(index: number, dir: number) {
    if (tilt) return;
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'flip', index, dir });
    } else {
      const fl = flippersRef.current[index];
      if (fl) Body.applyAngularImpulse(fl, dir * 0.02);
    }
  }

  function nudge() {
    const now = Date.now();
    nudgesRef.current = nudgesRef.current.filter((t) => now - t < 1000);
    nudgesRef.current.push(now);
    if (nudgesRef.current.length > 3) {
      setTilt(true);
      setTimeout(() => setTilt(false), 3000);
      return;
    }
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'nudge',
        force: { x: 0, y: -0.05 },
      });
    } else if (engineRef.current) {
      Composite.allBodies(engineRef.current.world).forEach((b: any) => {
        if (!b.isStatic) Body.applyForce(b, b.position, { x: 0, y: -0.05 });
      });
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.code === 'ArrowLeft') rotate(0, -1);
    if (e.code === 'ArrowRight') rotate(1, 1);
    if (e.code === 'Space') nudge();
  }
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function handleTouch(e: TouchEvent) {
    const x = e.changedTouches[0].clientX;
    if (x < window.innerWidth / 2) rotate(0, -1);
    else rotate(1, 1);
  }
  useEffect(() => {
    window.addEventListener('touchstart', handleTouch);
    return () => window.removeEventListener('touchstart', handleTouch);
  });

  function onBumperHit(x?: number, y?: number) {
    hitsRef.current += 1;
    if (hitsRef.current % 5 === 0) {
      setMultiplier((m) => m + 1);
    }
    setScore((s) => s + 100 * multiplier);
    bumperSound.current?.play();
    shake();
    if (x !== undefined && y !== undefined) {
      flashLight(x, y);
    }
    setCombo((c) => {
      const v = c + 1;
      if (v >= 3) {
        setMultiplier((m) => m + 1);
        return 0;
      }
      return v;
    });
    triggerHaptics();
  }

  function flashLight(x: number, y: number) {
    const app = pixiAppRef.current;
    if (!app) return;
    const pool = lightPoolRef.current;
    const g = pool.pop();
    if (!g) return;
    g.position.set(x, y);
    g.alpha = 1;
    g.visible = true;
    const fade = (delta: number) => {
      g.alpha -= 0.05 * delta;
      if (g.alpha <= 0) {
        g.visible = false;
        app.ticker.remove(fade);
        pool.push(g);
      }
    };
    app.ticker.add(fade);
  }

  function shake() {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 10;
    setShakeOffset({ x, y });
    if (pixiAppRef.current) {
      pixiAppRef.current.stage.x = x;
      pixiAppRef.current.stage.y = y;
    }
    setTimeout(() => {
      setShakeOffset({ x: 0, y: 0 });
      if (pixiAppRef.current) {
        pixiAppRef.current.stage.x = 0;
        pixiAppRef.current.stage.y = 0;
      }
    }, 100);
  }

  function triggerHaptics() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    const pads = navigator.getGamepads();
    const pad = pads[0];
    if (pad && pad.vibrationActuator) {
      pad.vibrationActuator.playEffect('dual-rumble', {
        duration: 50,
        strongMagnitude: 1,
        weakMagnitude: 1,
      });
    }
  }

  async function saveScore() {
    await fetch('/api/pinball/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, replay: [] }),
    });
  }

  function applyTable() {
    try {
      const t = JSON.parse(tableText);
      workerRef.current?.postMessage({ type: 'updateTable', table: t });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white">
      <div
        style={{
          position: 'relative',
          transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
        }}
      >
        <canvas ref={canvasRef} width={400} height={600} />
        <canvas
          ref={effectsRef}
          width={400}
          height={600}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        />
      </div>
      <div className="mt-2">Score: {score} (x{multiplier})</div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${
              combo > i ? 'bg-yellow-400' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
      <textarea
        value={tableText}
        onChange={(e) => setTableText(e.target.value)}
        className="mt-2 w-64 h-32 text-black"
      />
      <button
        onClick={applyTable}
        className="mt-2 px-2 py-1 bg-green-600 text-white rounded"
      >
        Apply Table
      </button>
      <button
        onClick={saveScore}
        className="mt-2 px-2 py-1 bg-blue-600 text-white rounded"
      >
        Save Score
      </button>
    </div>
  );
}

