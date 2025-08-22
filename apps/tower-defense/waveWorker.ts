import { astarPaths, spawnWave, stepEnemies, MapData, Enemy, Point } from './engine';

let enemies: Enemy[] = [];
let paths: Point[][] = [];

self.onmessage = (e: MessageEvent) => {
  const { type } = e.data;
  switch (type) {
    case 'init': {
      const map: MapData = e.data.map;
      const count: number = e.data.count || 5;
      paths = astarPaths(map);
      enemies = spawnWave(count, paths);
      (self as any).postMessage({ type: 'state', enemies, paths });
      break;
    }
    case 'tick': {
      enemies = stepEnemies(enemies, paths);
      (self as any).postMessage({ type: 'state', enemies });
      break;
    }
    default:
      break;
  }
};
