import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import Matter from 'matter-js';

export default function FlappyBird() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const width = 300;
    const height = 512;
    const app = new PIXI.Application({
      width,
      height,
      background: 0x70c5ce,
      resolution: window.devicePixelRatio || 1,
    });
    const view = app.view as HTMLCanvasElement;
    view.style.width = '100%';
    view.style.height = '100%';
    containerRef.current?.appendChild(view);

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Background layers for parallax
    const bgFar = new PIXI.TilingSprite(PIXI.Texture.WHITE, width, height);
    bgFar.tint = 0x70c5ce;
    app.stage.addChild(bgFar);

    const bgNear = new PIXI.TilingSprite(PIXI.Texture.WHITE, width, 112);
    bgNear.tint = 0xded895;
    bgNear.y = height - 112;
    app.stage.addChild(bgNear);

    // Bird
    const bird = new PIXI.Graphics();
    bird.beginFill(0xffea00);
    bird.drawCircle(0, 0, 12);
    bird.endFill();
    bird.x = width / 4;
    bird.y = height / 2;
    app.stage.addChild(bird);

    // Pipe pool
    const pipeWidth = 52;
    const pipeGap = 100;
    const pipeSpacing = 180;
    const pipeSpeed = 2;
    const pipes: { top: PIXI.Sprite; bottom: PIXI.Sprite }[] = [];

    function makePipe(x: number) {
      const top = new PIXI.Sprite(PIXI.Texture.WHITE);
      top.tint = 0x33aa33;
      top.width = pipeWidth;
      const bottom = new PIXI.Sprite(PIXI.Texture.WHITE);
      bottom.tint = 0x33aa33;
      bottom.width = pipeWidth;
      resetPipe(top, bottom, x);
      app.stage.addChild(top, bottom);
      pipes.push({ top, bottom });
    }

    function resetPipe(
      top: PIXI.Sprite,
      bottom: PIXI.Sprite,
      x: number
    ) {
      const center = 100 + Math.random() * 200;
      const topHeight = center - pipeGap / 2;
      const bottomHeight = height - (center + pipeGap / 2);
      top.height = topHeight;
      top.x = x;
      top.y = 0;
      bottom.height = bottomHeight;
      bottom.x = x;
      bottom.y = center + pipeGap / 2;
    }

    for (let i = 0; i < 3; i++) {
      makePipe(width + i * pipeSpacing);
    }

    // Physics
    const gravity = 0.25;
    let velocity = 0;
    let targetVelocity = 0;

    function flap() {
      targetVelocity = -6;
      if (navigator.vibrate) navigator.vibrate(50);
    }

    function boundsFor(
      x: number,
      y: number,
      w: number,
      h: number
    ): Matter.Bounds {
      return Matter.Bounds.create([
        { x, y },
        { x: x + w, y: y + h },
      ]);
    }

    let last = performance.now();
    let acc = 0;
    const step = 1000 / 60;

    const tick = () => {
      const now = performance.now();
      acc += now - last;
      last = now;
      while (acc >= step) {
        velocity += gravity;
        velocity += (targetVelocity - velocity) * 0.5;
        bird.y += velocity;
        targetVelocity = 0;

        const speed = reducedMotion ? 0 : pipeSpeed;
        bgFar.tilePosition.x -= speed * 0.2;
        bgNear.tilePosition.x -= speed;

        for (const { top, bottom } of pipes) {
          top.x -= speed;
          bottom.x -= speed;
          if (top.x + pipeWidth < 0) {
            resetPipe(top, bottom, width);
          }
        }

        const birdBounds = boundsFor(bird.x - 12, bird.y - 12, 24, 24);
        for (const { top, bottom } of pipes) {
          const topBounds = boundsFor(top.x, top.y, top.width, top.height);
          const bottomBounds = boundsFor(
            bottom.x,
            bottom.y,
            bottom.width,
            bottom.height
          );
          if (
            Matter.Bounds.overlaps(birdBounds, topBounds) ||
            Matter.Bounds.overlaps(birdBounds, bottomBounds) ||
            bird.y > height
          ) {
            if (navigator.vibrate) navigator.vibrate(100);
            bird.y = height / 2;
            velocity = 0;
            pipes.forEach((p, i) =>
              resetPipe(p.top, p.bottom, width + i * pipeSpacing)
            );
            break;
          }
        }

        acc -= step;
      }
    };

    app.ticker.add(tick);

    function onPointer() {
      flap();
    }
    window.addEventListener('pointerdown', onPointer);

    return () => {
      window.removeEventListener('pointerdown', onPointer);
      app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
