import * as PIXI from 'pixi.js';

export function createPixiApp(width = 320, height = 180) {
  const app = new PIXI.Application({ width, height, backgroundAlpha: 0 });
  const world = new PIXI.Container();
  app.stage.addChild(world);
  const camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
  return { app, world, camera };
}

export function updateCamera(camera, targetX, targetY, lerp = 0.1) {
  camera.targetX = targetX;
  camera.targetY = targetY;
  camera.x += (camera.targetX - camera.x) * lerp;
  camera.y += (camera.targetY - camera.y) * lerp;
}

export function renderWorld(world, camera) {
  world.position.set(-camera.x, -camera.y);
}

export function addCollectible(world, texture, x, y) {
  const sprite = new PIXI.Sprite(texture);
  sprite.x = x;
  sprite.y = y;
  sprite.name = 'collectible';
  world.addChild(sprite);
  return sprite;
}

export function addHazard(world, texture, x, y) {
  const sprite = new PIXI.Sprite(texture);
  sprite.x = x;
  sprite.y = y;
  sprite.name = 'hazard';
  world.addChild(sprite);
  return sprite;
}
