import apps, { games } from '../apps.config';

export interface AppSizeConfig {
  preferred: [number, number];
  min: [number, number];
  aspect?: number;
}

const registry: Record<string, AppSizeConfig> = {};

[...apps, ...games].forEach((app) => {
  const w = typeof app.defaultWidth === 'number' ? app.defaultWidth : 60;
  const h = typeof app.defaultHeight === 'number' ? app.defaultHeight : 85;
  registry[app.id] = {
    preferred: [w, h],
    min: [20, 20],
    aspect: parseFloat((w / h).toFixed(3)),
  };
});

export default registry;
