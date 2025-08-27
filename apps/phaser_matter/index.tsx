import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameState } from './gameLogic';

const PhaserMatter: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useRef({ left: false, right: false, jump: false });

  useEffect(() => {
    if (!containerRef.current) return;

    class LevelScene extends Phaser.Scene {
      player!: Phaser.Physics.Matter.Image;
      state!: GameState;
      lastGrounded = 0;
      coyoteTime = 100; // ms

      constructor() {
        super('level');
      }

      preload() {
        this.load.json('level', 'apps/phaser_matter/level1.json');
      }

      create() {
        const data = this.cache.json.get('level');
        this.state = new GameState(data.spawn);

        // Platforms
        data.platforms.forEach((p: any) => {
          this.matter.add.rectangle(p.x, p.y, p.width, p.height, { isStatic: true });
        });

        // Hazards
        data.hazards.forEach((h: any) => {
          this.matter.add.rectangle(h.x, h.y, h.width, h.height, {
            isStatic: true,
            label: 'hazard',
          });
        });

        // Checkpoints
        data.checkpoints.forEach((c: any) => {
          this.matter.add.rectangle(c.x, c.y, c.width, c.height, {
            isStatic: true,
            isSensor: true,
            label: 'checkpoint',
          });
        });

        this.player = this.matter.add.image(data.spawn.x, data.spawn.y, undefined, undefined, {
          shape: { type: 'rectangle', width: 32, height: 32 },
        });

        // Camera dead-zone
        this.cameras.main.setBounds(0, 0, data.bounds.width, data.bounds.height);
        this.cameras.main.setDeadzone(data.bounds.deadZoneWidth, data.bounds.deadZoneHeight);
        this.cameras.main.startFollow(this.player);

        // Collision events
        this.matter.world.on('collisionstart', (_: any, bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType) => {
          [bodyA, bodyB].forEach((body) => {
            if (body.label === 'checkpoint') {
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

      update(time: number) {
        const ctrl = controls.current;
        const speed = 5;
        if (ctrl.left) this.player.setVelocityX(-speed);
        else if (ctrl.right) this.player.setVelocityX(speed);
        else this.player.setVelocityX(0);

        const onGround = Math.abs(this.player.body.velocity.y) < 0.01;
        if (onGround) this.lastGrounded = time;
        if (ctrl.jump && (onGround || time - this.lastGrounded < this.coyoteTime)) {
          this.player.setVelocityY(-10);
          ctrl.jump = false; // consume jump
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

  const bind = (key: 'left' | 'right' | 'jump') => ({
    onMouseDown: () => (controls.current[key] = true),
    onMouseUp: () => (controls.current[key] = false),
    onTouchStart: () => (controls.current[key] = true),
    onTouchEnd: () => (controls.current[key] = false),
  });

  return (
    <div ref={containerRef} className="relative">
      <button className="absolute left-4 bottom-4" {...bind('left')}>◀</button>
      <button className="absolute left-20 bottom-4" {...bind('right')}>▶</button>
      <button className="absolute right-4 bottom-4" {...bind('jump')}>⇧</button>
    </div>
  );
};

export default PhaserMatter;
