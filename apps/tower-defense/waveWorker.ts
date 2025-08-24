import {
  computeFlowField,
  pathsFromDistance,
  spawnWave,
  stepEnemies,
  MapData,
  Enemy,
  flowRecomputeCount,
} from './engine';

let enemies: Enemy[] = [];
let paths: Point[][] = [];
let dist: number[][] = [];
let field: { dx: number; dy: number }[][] = [];
let recomputeCount = 0;

self.onmessage = (e: MessageEvent) => {
  const { type } = e.data;
  switch (type) {
    case 'init': {
      const map: MapData = e.data.map;
      const count: number = e.data.count || 5;
      const ff = computeFlowField(map);
      dist = ff.dist;
      field = ff.field;
      paths = pathsFromDistance(map, dist);
      recomputeCount = flowRecomputeCount;
      enemies = spawnWave(count, paths);
      (self as any).postMessage({
        type: 'state',
        enemies,
        paths,
        dist,
        field,
        recomputeCount,
      });
      break;
    }
    case 'updateMap': {
      const map: MapData = e.data.map;
      const ff = computeFlowField(map);
      dist = ff.dist;
      field = ff.field;
      paths = pathsFromDistance(map, dist);
      recomputeCount = flowRecomputeCount;
      (self as any).postMessage({
        type: 'field',
        dist,
        field,
        paths,
        recomputeCount,
      });
      break;
    }
    case 'spawn': {
      const count: number = e.data.count || 5;
      enemies = enemies.concat(spawnWave(count, paths));
      (self as any).postMessage({ type: 'state', enemies, recomputeCount });
      break;
    }
    case 'tick': {
      enemies = stepEnemies(enemies, paths);
      (self as any).postMessage({ type: 'state', enemies, recomputeCount });
      break;
    }
    default:
      break;
  }
};
