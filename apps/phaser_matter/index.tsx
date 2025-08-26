import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

const PhaserMatter: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      physics: {
        default: 'matter',
        matter: {
          gravity: { y: 1 },
        },
      },
      scene: {
        create() {
          const groundCategory = this.matter.world.nextCategory();
          const ballCategory = this.matter.world.nextCategory();

          // Ground with high friction
          this.matter.add.rectangle(400, 580, 800, 40, {
            isStatic: true,
            friction: 1,
            collisionFilter: { category: groundCategory },
            render: { fillColor: 0x888888 },
          });

          // Platform with low friction
          this.matter.add.rectangle(400, 400, 200, 20, {
            isStatic: true,
            friction: 0,
            collisionFilter: { category: groundCategory },
            render: { fillColor: 0xaaaaaa },
          });

          // Ball that collides only with ground layer
          this.matter.add.circle(150, 0, 20, {
            restitution: 0.8,
            friction: 0.05,
            frictionAir: 0.001,
            collisionFilter: { category: ballCategory, mask: groundCategory },
            render: { fillColor: 0xff0000 },
          });

          // Box on separate collision layer that ignores the ball
          const boxCategory = this.matter.world.nextCategory();
          this.matter.add.rectangle(650, 0, 40, 40, {
            restitution: 0.1,
            collisionFilter: { category: boxCategory, mask: groundCategory | boxCategory },
            render: { fillColor: 0x00ff00 },
          });
        },
      },
    };

    const game = new Phaser.Game(config);
    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={containerRef} />;
};

export default PhaserMatter;
