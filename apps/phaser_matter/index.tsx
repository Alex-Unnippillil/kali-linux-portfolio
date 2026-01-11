"use client";

import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameState } from './gameLogic';
import usePersistedState from '../../hooks/usePersistedState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

type Action = 'left' | 'right' | 'jump';

interface PhaserMatterProps {
  getDailySeed?: () => Promise<string>;
}

const PhaserMatter: React.FC<PhaserMatterProps> = ({ getDailySeed }) => {
  void getDailySeed;
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const prefersRef = useRef(prefersReducedMotion);
  // Pause the game loop entirely when reduced motion is requested
  useEffect(() => {
    prefersRef.current = prefersReducedMotion;
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('level') as Phaser.Scene & {
      matter: Phaser.Physics.Matter.MatterPhysics;
    };
    if (prefersReducedMotion) {
      scene.scene.pause();
      scene.matter.world.pause();
    } else {
      scene.scene.resume();
      scene.matter.world.resume();
    }
  }, [prefersReducedMotion]);
  const controls = useRef({
    left: false,
    right: false,
    jumpHeld: false,
    jumpPressed: false,
  });

  const [keyMap, setKeyMap] = usePersistedState<Record<Action, string>>('phaser-keys', {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'Space',
  });
  const [padMap, setPadMap] = usePersistedState<Record<Action, number>>('phaser-pad', {
    left: 14,
    right: 15,
    jump: 0,
  });
  const [bufferWindow, setBufferWindow] = usePersistedState<number>('phaser-buffer', 100);
  const bufferRef = useRef(bufferWindow);
  useEffect(() => {
    bufferRef.current = bufferWindow;
  }, [bufferWindow]);
  const keyMapRef = useRef(keyMap);
  useEffect(() => {
    keyMapRef.current = keyMap;
  }, [keyMap]);
  const padMapRef = useRef(padMap);
  useEffect(() => {
    padMapRef.current = padMap;
  }, [padMap]);
  const [waiting, setWaiting] = useState<
    null | { device: 'key' | 'pad'; action: Action }
  >(null);

  const actions: { action: Action; label: string }[] = [
    { action: 'left', label: 'Left' },
    { action: 'right', label: 'Right' },
    { action: 'jump', label: 'Jump' },
  ];

  useEffect(() => {
    // ensure container receives keyboard focus
    containerRef.current?.focus();
  }, []);

  // Keyboard input and remapping
  useEffect(() => {
    if (!containerRef.current) return;
    // scope listener to the game container to avoid global key events
    const target = containerRef.current;
    const handle = (e: KeyboardEvent) => {
      if (waiting?.device === 'key' && e.type === 'keydown') {
        setKeyMap((prev) => ({ ...prev, [waiting.action]: e.code }));
        setWaiting(null);
        return;
      }
      const pressed = e.type === 'keydown';
      const action = (Object.keys(keyMapRef.current) as Action[]).find(
        (a) => keyMapRef.current[a] === e.code,
      );
      if (action) {
        if (action === 'jump') {
          if (pressed && !controls.current.jumpHeld) controls.current.jumpPressed = true;
          controls.current.jumpHeld = pressed;
        } else {
          controls.current[action] = pressed;
        }
      }
    };
    target.addEventListener('keydown', handle);
    target.addEventListener('keyup', handle);
    return () => {
      target.removeEventListener('keydown', handle);
      target.removeEventListener('keyup', handle);
    };
  }, [waiting, setKeyMap]);

  // Gamepad remapping polling when waiting
  useEffect(() => {
    if (!waiting || waiting.device !== 'pad') return;
    // poll at 100ms intervals instead of every frame to reduce CPU
    const interval = setInterval(() => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of pads) {
        if (!gp) continue;
        for (let i = 0; i < gp.buttons.length; i++) {
          const button = gp.buttons[i];
          if (button?.pressed) {
            setPadMap((prev) => ({ ...prev, [waiting.action]: i }));
            setWaiting(null);
            return;
          }
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [waiting, setPadMap]);

  useEffect(() => {
    if (!containerRef.current) return;

    class LevelScene extends Phaser.Scene {
      player!: Phaser.Physics.Matter.Image;
      declare gameState: GameState;
      lastGrounded = 0;
      coyoteTime = 100; // ms
      jumpBufferTimer = 0;
      buffered = false;
      padJumpWasPressed = false;
      parallax: Phaser.GameObjects.Rectangle[] = [];
      checkpointFlags: { body: MatterJS.BodyType; flag: Phaser.GameObjects.Rectangle }[] = [];
      coins: { body: MatterJS.BodyType; sprite: Phaser.GameObjects.Rectangle }[] = [];
      coinText!: Phaser.GameObjects.Text;

      constructor() {
        super('level');
      }

      preload() {
        this.load.json('level', 'apps/phaser_matter/level1.json');
        this.load.image('player', 'apps/phaser_matter/player.svg');
      }

      create() {
        const data = this.cache.json.get('level');
        this.gameState = new GameState(data.spawn);

        // collision categories for broad-phase filtering
        // player interacts with scenery + interactive objects only
        const CAT_PLAYER = 0x0001;
        const CAT_SCENERY = 0x0002;
        const CAT_INTERACTIVE = 0x0004;

        // Parallax background layers
        data.parallaxLayers?.forEach((l: any) => {
          const color = Phaser.Display.Color.HexStringToColor(l.color).color;
          const rect = this.add
            .rectangle(
              data.bounds.width / 2,
              data.bounds.height / 2,
              data.bounds.width,
              data.bounds.height,
              color,
            )
            .setScrollFactor(l.scrollFactor)
            .setDepth(-100);
          this.parallax.push(rect);
        });

        // Platforms (collide only with player)
        data.platforms.forEach((p: any) => {
          this.matter.add.rectangle(p.x, p.y, p.width, p.height, {
            isStatic: true,
            collisionFilter: { category: CAT_SCENERY, mask: CAT_PLAYER },
          });
        });

        // Hazards and other interactive bodies collide only with player
        data.hazards.forEach((h: any) => {
          this.matter.add.rectangle(h.x, h.y, h.width, h.height, {
            isStatic: true,
            label: 'hazard',
            collisionFilter: { category: CAT_INTERACTIVE, mask: CAT_PLAYER },
          });
        });

        // Coins
        data.coins?.forEach((c: any) => {
          const body = this.matter.add.rectangle(c.x, c.y, c.width, c.height, {
            isStatic: true,
            isSensor: true,
            label: 'coin',
            collisionFilter: { category: CAT_INTERACTIVE, mask: CAT_PLAYER },
          });
          const sprite = this.add
            .rectangle(c.x, c.y, c.width, c.height, 0xffd700)
            .setOrigin(0.5);
          this.coins.push({ body, sprite });
        });

        // Checkpoints with flags
        data.checkpoints.forEach((c: any) => {
          const body = this.matter.add.rectangle(c.x, c.y, c.width, c.height, {
            isStatic: true,
            isSensor: true,
            label: 'checkpoint',
            collisionFilter: { category: CAT_INTERACTIVE, mask: CAT_PLAYER },
          });
          const flag = this.add
            .rectangle(c.x, c.y - c.height / 2, 10, 30, 0xff0000)
            .setOrigin(0.5, 1);
          this.checkpointFlags.push({ body, flag });
        });


        this.player = this.matter.add.image(data.spawn.x, data.spawn.y, 'player', undefined, {
          shape: { type: 'rectangle', width: 32, height: 32 },
          collisionFilter: { category: CAT_PLAYER, mask: CAT_SCENERY | CAT_INTERACTIVE },
        });

        this.coinText = this.add
          .text(16, 16, 'Coins: 0', { color: '#ffffff' })
          .setScrollFactor(0);

        // Camera dead-zone
        this.cameras.main.setBounds(0, 0, data.bounds.width, data.bounds.height);
        this.cameras.main.setDeadzone(data.bounds.deadZoneWidth, data.bounds.deadZoneHeight);
        this.cameras.main.startFollow(this.player);

        // Collision events (essential for checkpoint/hazard handling)
        const relevant = new Set(['checkpoint', 'hazard', 'coin']);
        this.matter.world.on(
          'collisionstart',
          (_: any, bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType) => {
            // Early exit if neither body is relevant to gameplay
            if (!relevant.has(bodyA.label) && !relevant.has(bodyB.label)) return;

            const start = performance.now();
            [bodyA, bodyB].forEach((body) => {
              if (body.label === 'checkpoint') {
                const cp = this.checkpointFlags.find((c) => c.body === body);
                if (cp) cp.flag.setFillStyle(0x00ff00);
                this.gameState.setCheckpoint({ x: body.position.x, y: body.position.y });
              }
              if (body.label === 'hazard') {
                const s = this.gameState.getRespawnPoint();
                this.player.setPosition(s.x, s.y);
                this.player.setVelocity(0, 0);
              }
              if (body.label === 'coin') {
                const idx = this.coins.findIndex((c) => c.body === body);
                if (idx >= 0) {
                  const coin = this.coins.splice(idx, 1)[0];
                  if (coin) {
                    coin.sprite.destroy();
                    this.matter.world.remove(body);
                    const count = this.gameState.addCoin();
                    this.coinText.setText(`Coins: ${count}`);
                  }
                }
              }
            });
            const duration = performance.now() - start;
            // accessing Matter's internal world; cast to any to avoid TS limitations
            const bodyCount = (this.matter.world.engine.world as any).bodies.length;
            // Log when collision handling becomes expensive (>200 bodies or >1ms)
            if (bodyCount > 200 || duration > 1) {
              // Documented threshold to help tune level complexity
              console.debug(
                `collision handler: ${duration.toFixed(2)}ms with ${bodyCount} bodies`,
              );
            }
          },
        );
      }

      override update(time: number, delta: number) {
        const ctrl = controls.current;
        const speed = 5;
        const fixedDelta = Math.min(delta, 1000 / 60);

        // Poll gamepad for input
        const gamepad = this.input.gamepad;
        if (gamepad && gamepad.total > 0) {
          const pad = gamepad.getPad(0);
          const pm = padMapRef.current;
          ctrl.left = !!pad.buttons[pm.left]?.pressed;
          ctrl.right = !!pad.buttons[pm.right]?.pressed;
          const jp = !!pad.buttons[pm.jump]?.pressed;
          if (jp && !this.padJumpWasPressed) {
            ctrl.jumpPressed = true;
            ctrl.jumpHeld = true;
          } else if (!jp) {
            ctrl.jumpHeld = false;
          }
          this.padJumpWasPressed = jp;
        }

        if (ctrl.left) this.player.setVelocityX(-speed);
        else if (ctrl.right) this.player.setVelocityX(speed);
        else this.player.setVelocityX(0);

        const body = this.player.body as MatterJS.BodyType;
        const onGround = Math.abs(body.velocity.y) < 0.01;

        if (onGround) this.lastGrounded = time;

        if (ctrl.jumpPressed) {
          this.jumpBufferTimer = bufferRef.current;
          const canJump = onGround || time - this.lastGrounded < this.coyoteTime;
          this.buffered = !canJump;
          ctrl.jumpPressed = false;
          if (canJump) {
            this.player.setVelocityY(-10);
            ctrl.jumpHeld = false;
            this.buffered = false;
          }
        }

        if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= fixedDelta;

        const canJump = onGround || time - this.lastGrounded < this.coyoteTime;
        if (canJump && this.jumpBufferTimer > 0) {
          this.player.setVelocityY(-10);
          this.jumpBufferTimer = 0;
          ctrl.jumpHeld = false;
          if (this.buffered) {
            this.player.setTintFill(0xffff00);
            this.time.delayedCall(100, () => this.player.clearTint());
          }
          this.buffered = false;
        }

        const data = this.cache.json.get('level');
        const pos = this.gameState.respawnIfOutOfBounds({ x: this.player.x, y: this.player.y }, data.bounds.fallY);
        if (pos !== this.player) {
          this.player.setPosition(pos.x, pos.y);
          this.player.setVelocity(0, 0);
        }
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      physics: {
        default: 'matter',
        matter: {
          gravity: { y: 1 },
          positionIterations: 4,
          velocityIterations: 3,
          constraintIterations: 2,
        },
      },
      scene: LevelScene,
    });
    gameRef.current = game;

    const handleVisibility = () => {
      const scene = game.scene.getScene('level') as Phaser.Scene & {
        matter: Phaser.Physics.Matter.MatterPhysics;
      };
      if (document.visibilityState === 'hidden' || prefersRef.current) {
        scene.scene.pause();
        scene.matter.world.pause();
      } else {
        scene.scene.resume();
        scene.matter.world.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    handleVisibility();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const bind = (key: Action) =>
    key === 'jump'
      ? {
          onMouseDown: () => {
            controls.current.jumpPressed = true;
            controls.current.jumpHeld = true;
          },
          onMouseUp: () => (controls.current.jumpHeld = false),
          onTouchStart: () => {
            controls.current.jumpPressed = true;
            controls.current.jumpHeld = true;
          },
          onTouchEnd: () => (controls.current.jumpHeld = false),
        }
      : {
          onMouseDown: () => (controls.current[key] = true),
          onMouseUp: () => (controls.current[key] = false),
          onTouchStart: () => (controls.current[key] = true),
          onTouchEnd: () => (controls.current[key] = false),
        };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[420px] overflow-hidden rounded-2xl border border-kali-border/80 bg-kali-surface/95 shadow-lg backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-kali-border/60" aria-hidden="true" />
        <div className="absolute inset-x-6 bottom-6 flex items-center justify-between gap-4 pointer-events-none">
          <button
            type="button"
            aria-label="Move left"
            className="pointer-events-auto rounded-full border border-[color:var(--kali-border)] bg-kali-surface/85 px-4 py-3 text-xl font-semibold text-[color:var(--kali-text)] shadow transition-colors hover:border-[color:var(--color-control-accent)] hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_22%,var(--kali-surface))] hover:text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
            {...bind('left')}
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="Move right"
            className="pointer-events-auto rounded-full border border-[color:var(--kali-border)] bg-kali-surface/85 px-4 py-3 text-xl font-semibold text-[color:var(--kali-text)] shadow transition-colors hover:border-[color:var(--color-control-accent)] hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_22%,var(--kali-surface))] hover:text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
            {...bind('right')}
          >
            ▶
          </button>
          <button
            type="button"
            aria-label="Jump"
            className="pointer-events-auto rounded-full border border-[color:var(--kali-border)] bg-kali-surface/85 px-4 py-3 text-xl font-semibold text-[color:var(--kali-text)] shadow transition-colors hover:border-[color:var(--color-control-accent)] hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_22%,var(--kali-surface))] hover:text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
            {...bind('jump')}
          >
            ⇧
          </button>
        </div>
      </div>
      <aside className="w-full space-y-4 rounded-2xl border border-kali-border/80 bg-kali-surface/95 p-4 text-sm leading-relaxed text-white shadow-lg backdrop-blur lg:w-72">
        {waiting && (
          <div className="rounded-lg border border-kali-control/50 bg-kali-control/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-kali-control">
            Press a {waiting.device === 'key' ? 'key' : 'button'}...
          </div>
        )}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-kali-control/80">Keyboard</h2>
          <div className="space-y-2">
            {actions.map((entry) => (
              <div key={`key-${entry.action}`} className="flex items-center justify-between gap-2">
                <span>{entry.label}</span>
                <button
                  type="button"
                  onClick={() => setWaiting({ device: 'key', action: entry.action })}
                  className="rounded-md border border-kali-border/70 bg-kali-background/40 px-2 py-1 text-xs font-medium text-white transition hover:border-kali-control hover:text-kali-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
                >
                  {keyMap[entry.action]}
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-kali-control/80">Gamepad</h2>
          <div className="space-y-2">
            {actions.map((entry) => (
              <div key={`pad-${entry.action}`} className="flex items-center justify-between gap-2">
                <span>{entry.label}</span>
                <button
                  type="button"
                  onClick={() => setWaiting({ device: 'pad', action: entry.action })}
                  className="rounded-md border border-kali-border/70 bg-kali-background/40 px-2 py-1 text-xs font-medium text-white transition hover:border-kali-control hover:text-kali-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
                >
                  {padMap[entry.action]}
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-kali-control/80">Jump Buffer</h2>
          <label htmlFor="jump-buffer" className="block space-y-2 text-xs text-white/70">
            <span>Control how long a jump input remains buffered after pressing the button.</span>
            <input
              id="jump-buffer"
              type="range"
              min={0}
              max={300}
              value={bufferWindow}
              onChange={(e) => setBufferWindow(Number(e.target.value))}
              aria-label="Jump buffer window"
              className="w-full accent-kali-control"
            />
          </label>
          <div className="text-right text-xs font-semibold text-kali-control">{bufferWindow}ms</div>
        </section>
      </aside>
    </div>
  );
};

export default PhaserMatter;
