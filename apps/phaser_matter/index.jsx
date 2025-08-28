import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameState } from './gameLogic';
import usePersistedState from '../../hooks/usePersistedState';
const PhaserMatter = () => {
    const containerRef = useRef(null);
    const controls = useRef({
        left: false,
        right: false,
        jumpHeld: false,
        jumpPressed: false,
    });
    const [keyMap, setKeyMap] = usePersistedState('phaser-keys', {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        jump: 'Space',
    });
    const [padMap, setPadMap] = usePersistedState('phaser-pad', {
        left: 14,
        right: 15,
        jump: 0,
    });
    const [bufferWindow, setBufferWindow] = usePersistedState('phaser-buffer', 100);
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
    const [waiting, setWaiting] = useState(null);
    // Keyboard input and remapping
    useEffect(() => {
        const handle = (e) => {
            if (waiting?.device === 'key' && e.type === 'keydown') {
                setKeyMap((prev) => ({ ...prev, [waiting.action]: e.code }));
                setWaiting(null);
                return;
            }
            const pressed = e.type === 'keydown';
            const action = Object.keys(keyMapRef.current).find((a) => keyMapRef.current[a] === e.code);
            if (action) {
                if (action === 'jump') {
                    if (pressed && !controls.current.jumpHeld)
                        controls.current.jumpPressed = true;
                    controls.current.jumpHeld = pressed;
                }
                else {
                    controls.current[action] = pressed;
                }
            }
        };
        window.addEventListener('keydown', handle);
        window.addEventListener('keyup', handle);
        return () => {
            window.removeEventListener('keydown', handle);
            window.removeEventListener('keyup', handle);
        };
    }, [waiting, setKeyMap]);
    // Gamepad remapping polling when waiting
    useEffect(() => {
        if (!waiting || waiting.device !== 'pad')
            return;
        let raf;
        const poll = () => {
            const pads = navigator.getGamepads ? navigator.getGamepads() : [];
            for (const gp of pads) {
                if (!gp)
                    continue;
                for (let i = 0; i < gp.buttons.length; i++) {
                    if (gp.buttons[i].pressed) {
                        setPadMap((prev) => ({ ...prev, [waiting.action]: i }));
                        setWaiting(null);
                        return;
                    }
                }
            }
            raf = requestAnimationFrame(poll);
        };
        raf = requestAnimationFrame(poll);
        return () => cancelAnimationFrame(raf);
    }, [waiting, setPadMap]);
    useEffect(() => {
        if (!containerRef.current)
            return;
        class LevelScene extends Phaser.Scene {
            constructor() {
                super('level');
                this.lastGrounded = 0;
                this.coyoteTime = 100; // ms
                this.jumpBufferTimer = 0;
                this.buffered = false;
                this.padJumpWasPressed = false;
                this.parallax = [];
                this.checkpointFlags = [];
            }
            preload() {
                this.load.json('level', 'apps/phaser_matter/level1.json');
            }
            create() {
                const data = this.cache.json.get('level');
                this.state = new GameState(data.spawn);
                // Parallax background layers
                data.parallaxLayers?.forEach((l) => {
                    const color = Phaser.Display.Color.HexStringToColor(l.color).color;
                    const rect = this.add
                        .rectangle(data.bounds.width / 2, data.bounds.height / 2, data.bounds.width, data.bounds.height, color)
                        .setScrollFactor(l.scrollFactor)
                        .setDepth(-100);
                    this.parallax.push(rect);
                });
                // Platforms
                data.platforms.forEach((p) => {
                    this.matter.add.rectangle(p.x, p.y, p.width, p.height, { isStatic: true });
                });
                // Hazards
                data.hazards.forEach((h) => {
                    this.matter.add.rectangle(h.x, h.y, h.width, h.height, {
                        isStatic: true,
                        label: 'hazard',
                    });
                });
                // Checkpoints with flags
                data.checkpoints.forEach((c) => {
                    const body = this.matter.add.rectangle(c.x, c.y, c.width, c.height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'checkpoint',
                    });
                    const flag = this.add
                        .rectangle(c.x, c.y - c.height / 2, 10, 30, 0xff0000)
                        .setOrigin(0.5, 1);
                    this.checkpointFlags.push({ body, flag });
                });
                this.player = this.matter.add.image(data.spawn.x, data.spawn.y, undefined, undefined, {
                    shape: { type: 'rectangle', width: 32, height: 32 },
                });
                // Camera dead-zone
                this.cameras.main.setBounds(0, 0, data.bounds.width, data.bounds.height);
                this.cameras.main.setDeadzone(data.bounds.deadZoneWidth, data.bounds.deadZoneHeight);
                this.cameras.main.startFollow(this.player);
                // Collision events
                this.matter.world.on('collisionstart', (_, bodyA, bodyB) => {
                    [bodyA, bodyB].forEach((body) => {
                        if (body.label === 'checkpoint') {
                            const cp = this.checkpointFlags.find((c) => c.body === body);
                            if (cp)
                                cp.flag.setFillStyle(0x00ff00);
                            this.state.setCheckpoint({ x: body.position.x, y: body.position.y });
                        }
                        if (body.label === 'hazard') {
                            const s = this.state.checkpoint || this.state.spawn;
                            this.player.setPosition(s.x, s.y);
                            this.player.setVelocity(0, 0);
                        }
                    });
                });
            }
            update(time, delta) {
                const ctrl = controls.current;
                const speed = 5;
                // Poll gamepad for input
                if (this.input.gamepad.total > 0) {
                    const pad = this.input.gamepad.getPad(0);
                    const pm = padMapRef.current;
                    ctrl.left = pad.buttons[pm.left]?.pressed;
                    ctrl.right = pad.buttons[pm.right]?.pressed;
                    const jp = pad.buttons[pm.jump]?.pressed;
                    if (jp && !this.padJumpWasPressed) {
                        ctrl.jumpPressed = true;
                        ctrl.jumpHeld = true;
                    }
                    else if (!jp) {
                        ctrl.jumpHeld = false;
                    }
                    this.padJumpWasPressed = jp;
                }
                if (ctrl.left)
                    this.player.setVelocityX(-speed);
                else if (ctrl.right)
                    this.player.setVelocityX(speed);
                else
                    this.player.setVelocityX(0);
                const onGround = Math.abs(this.player.body.velocity.y) < 0.01;
                if (onGround)
                    this.lastGrounded = time;
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
                if (this.jumpBufferTimer > 0)
                    this.jumpBufferTimer -= delta;
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
                const pos = this.state.respawnIfOutOfBounds({ x: this.player.x, y: this.player.y }, data.bounds.fallY);
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
            physics: { default: 'matter', matter: { gravity: { y: 1 } } },
            scene: LevelScene,
        });
        return () => {
            game.destroy(true);
        };
    }, []);
    const bind = (key) => key === 'jump'
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
    return (<div ref={containerRef} className="relative">
      <button className="absolute left-4 bottom-4" {...bind('left')}>
        ◀
      </button>
      <button className="absolute left-20 bottom-4" {...bind('right')}>
        ▶
      </button>
      <button className="absolute right-4 bottom-4" {...bind('jump')}>
        ⇧
      </button>
      <div className="absolute top-4 left-4 bg-white bg-opacity-80 p-2 rounded text-xs space-y-1">
        {waiting && <div>Press a {waiting.device === 'key' ? 'key' : 'button'}...</div>}
        <div>Keyboard</div>
        <div>
          Left:
          <button onClick={() => setWaiting({ device: 'key', action: 'left' })} className="ml-1 border px-1">
            {keyMap.left}
          </button>
        </div>
        <div>
          Right:
          <button onClick={() => setWaiting({ device: 'key', action: 'right' })} className="ml-1 border px-1">
            {keyMap.right}
          </button>
        </div>
        <div>
          Jump:
          <button onClick={() => setWaiting({ device: 'key', action: 'jump' })} className="ml-1 border px-1">
            {keyMap.jump}
          </button>
        </div>
        <div className="pt-2">Gamepad</div>
        <div>
          Left:
          <button onClick={() => setWaiting({ device: 'pad', action: 'left' })} className="ml-1 border px-1">
            {padMap.left}
          </button>
        </div>
        <div>
          Right:
          <button onClick={() => setWaiting({ device: 'pad', action: 'right' })} className="ml-1 border px-1">
            {padMap.right}
          </button>
        </div>
        <div>
          Jump:
          <button onClick={() => setWaiting({ device: 'pad', action: 'jump' })} className="ml-1 border px-1">
            {padMap.jump}
          </button>
        </div>
        <div className="pt-2">
          Buffer:
          <input type="range" min={0} max={300} value={bufferWindow} onChange={(e) => setBufferWindow(Number(e.target.value))} className="mx-1"/>
          {bufferWindow}ms
        </div>
      </div>
    </div>);
};
export default PhaserMatter;
