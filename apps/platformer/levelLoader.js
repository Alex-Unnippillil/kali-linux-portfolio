import { Terrain } from './Terrain.js';
import { Enemy } from './Enemy.js';
import { Checkpoint } from './checkpoint.js';

function chunk(data, size) {
  const rows = [];
  for (let i = 0; i < data.length; i += size) {
    rows.push(data.slice(i, i + size));
  }
  return rows;
}

export async function loadLevel(name) {
  const res = await fetch(`/platformer/maps/${name}.json`);
  const map = await res.json();
  const terrainLayer = map.layers.find((l) => l.name === 'terrain');
  const enemyLayer = map.layers.find((l) => l.name === 'enemies');
  const collectibleLayer = map.layers.find((l) => l.name === 'collectibles');
  const checkpointLayer = map.layers.find((l) => l.name === 'checkpoints');
  const tiles = terrainLayer ? chunk(terrainLayer.data, map.width) : [];
  const collectibles = collectibleLayer
    ? chunk(collectibleLayer.data, map.width)
    : [];
  const terrain = new Terrain(map.tilewidth, tiles);
  const enemies = [];
  if (enemyLayer && enemyLayer.objects) {
    enemyLayer.objects.forEach((o) => {
      enemies.push(new Enemy(o.x, o.y, o.properties?.patrol || 0));
    });
  }
  const checkpoints = [];
  if (checkpointLayer && checkpointLayer.objects) {
    checkpointLayer.objects.forEach((o) => {
      checkpoints.push(new Checkpoint(o.x, o.y));
    });
  }
  const parallax = map.layers
    .filter((l) => l.type === 'imagelayer')
    .map((l) => l.image);
  return {
    terrain,
    enemies,
    collectibles,
    checkpoints,
    parallax,
    width: map.width,
    height: map.height,
  };
}
