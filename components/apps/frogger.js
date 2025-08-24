import React, { useRef, useEffect } from 'react';
import {
  TILE,
  NUM_TILES_WIDE,
  PAD_POSITIONS,
  COLLISION_TOLERANCE,
  initLane,
  updateCars,
  handlePads,
  rampLane,
  carLaneDefs,
  logLaneDefs,
  EASINGS,
  rectsIntersect,
} from '../../apps/frogger/engine';

// Frogger game rendered with PixiJS sprites and basic HUD
const Frogger = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    let app;
    let PIXI;
    let lanes = [];
    let frog;
    let livesText;
    let timerText;
    let pads = PAD_POSITIONS.map(() => false);
    let lives = 3;
    let timer = 60;
    let last = performance.now();
    let raf;
    let touchStart = null;

    // lazy load pixi to keep tests light
    import('pixi.js').then((lib) => {
      PIXI = lib;
      app = new PIXI.Application({
        width: TILE * NUM_TILES_WIDE,
        height: TILE * NUM_TILES_WIDE,
        backgroundAlpha: 0,
      });
      containerRef.current.appendChild(app.view);

      // frog sprite
      frog = new PIXI.Sprite(PIXI.Texture.WHITE);
      frog.width = frog.height = TILE;
      frog.tint = 0x00ff00;
      frog.x = (NUM_TILES_WIDE / 2) * TILE - TILE / 2;
      frog.y = TILE * (NUM_TILES_WIDE - 1);
      frog.hitArea = new PIXI.Rectangle(
        COLLISION_TOLERANCE,
        COLLISION_TOLERANCE,
        TILE - COLLISION_TOLERANCE * 2,
        TILE - COLLISION_TOLERANCE * 2,
      );
      app.stage.addChild(frog);

      // HUD text
      livesText = new PIXI.Text(`Lives: ${lives}`, {
        fill: 'white',
        fontSize: 14,
      });
      livesText.x = 5;
      livesText.y = 5;
      timerText = new PIXI.Text(`Time: ${timer}`, {
        fill: 'white',
        fontSize: 14,
      });
      timerText.x = 5;
      timerText.y = 20;
      app.stage.addChild(livesText);
      app.stage.addChild(timerText);

      const initLevel = () => {
        lanes = [];
        carLaneDefs.forEach((def, i) => {
          const lane = rampLane(
            { ...def, y: TILE * (NUM_TILES_WIDE - (i + 2)) },
            1,
            0.3,
          );
          lanes.push(initLane(lane, i + 1));
        });
        logLaneDefs.forEach((def, i) => {
          const lane = rampLane({ ...def, y: TILE * (i + 1) }, 1, 0.5);
          lanes.push(initLane(lane, i + 10));
        });
      };

      const resetFrog = () => {
        frog.x = (NUM_TILES_WIDE / 2) * TILE - TILE / 2;
        frog.y = TILE * (NUM_TILES_WIDE - 1);
      };

      const moveFrog = (dx, dy) => {
        frog.x = Math.max(0, Math.min(TILE * (NUM_TILES_WIDE - 1), frog.x + dx));
        frog.y = Math.max(0, Math.min(TILE * (NUM_TILES_WIDE - 1), frog.y + dy));
      };

      const update = (now) => {
        const dt = (now - last) / 1000;
        last = now;
        timer -= dt;
        if (timer <= 0) {
          lives -= 1;
          timer = 60;
          resetFrog();
        }

        const result = updateCars(lanes, { x: frog.x, y: frog.y }, dt);
        lanes = result.lanes;
        frog.x += result.frogDx;
        if (result.dead) {
          lives -= 1;
          resetFrog();
        }

        // spawn/remove sprites for lane items
        lanes.forEach((lane) => {
          lane.sprites = lane.sprites || [];
          lane.items.forEach((item, idx) => {
            let sprite = lane.sprites[idx];
            if (!sprite) {
              sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
              sprite.width = item.width;
              sprite.height = TILE;
              sprite.tint = lane.type === 'car' ? 0x888888 : 0x964b00;
              sprite.hitArea = new PIXI.Rectangle(0, 0, sprite.width, TILE);
              app.stage.addChild(sprite);
              lane.sprites[idx] = sprite;
            }
            sprite.x = item.x;
            sprite.y = lane.y;
          });
          lane.sprites.slice(lane.items.length).forEach((s) => s.destroy());
          lane.sprites.length = lane.items.length;
        });

        // pad handling
        if (frog.y <= 0) {
          const res = handlePads({ x: frog.x, y: 0 }, pads);
          pads = res.pads;
          if (res.padHit) {
            resetFrog();
            timer = 60;
          }
          if (res.dead) {
            lives -= 1;
            resetFrog();
          }
        }

        livesText.text = `Lives: ${lives}`;
        timerText.text = `Time: ${Math.ceil(timer)}`;

        raf = requestAnimationFrame(update);
      };

      initLevel();
      raf = requestAnimationFrame(update);

      const handleKey = (e) => {
        switch (e.key) {
          case 'ArrowLeft':
            moveFrog(-TILE, 0);
            break;
          case 'ArrowRight':
            moveFrog(TILE, 0);
            break;
          case 'ArrowUp':
            moveFrog(0, -TILE);
            break;
          case 'ArrowDown':
            moveFrog(0, TILE);
            break;
          default:
        }
      };
      window.addEventListener('keydown', handleKey);

      const handleTouchStart = (e) => {
        touchStart = e.changedTouches[0];
      };
      const handleTouchEnd = (e) => {
        const end = e.changedTouches[0];
        const dx = end.clientX - touchStart.clientX;
        const dy = end.clientY - touchStart.clientY;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 20) moveFrog(TILE, 0);
          else if (dx < -20) moveFrog(-TILE, 0);
        } else {
          if (dy > 20) moveFrog(0, TILE);
          else if (dy < -20) moveFrog(0, -TILE);
        }
      };
      app.view.addEventListener('touchstart', handleTouchStart);
      app.view.addEventListener('touchend', handleTouchEnd);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', handleKey);
        app.view.removeEventListener('touchstart', handleTouchStart);
        app.view.removeEventListener('touchend', handleTouchEnd);
        app.destroy(true, { children: true });
      };
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      role="application"
      aria-label="Frogger game"
    />
  );
};

export {
  initLane,
  updateCars,
  handlePads,
  PAD_POSITIONS,
  rampLane,
  carLaneDefs,
  logLaneDefs,
  TILE,
  COLLISION_TOLERANCE,
  EASINGS,
  rectsIntersect,
};

export default Frogger;

