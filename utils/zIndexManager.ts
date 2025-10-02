const BASE_LAYERS = {
  desktop: 0,
  dock: 20,
  appWindow: 60,
  pip: 80,
  systemOverlay: 120,
  tooltip: 140,
} as const;

type LayerName = keyof typeof BASE_LAYERS;

type LayerOverrides = Partial<Record<LayerName, number>>;

class ZIndexManager {
  private overrides: LayerOverrides = {};

  get(layer: LayerName): number {
    return this.overrides[layer] ?? BASE_LAYERS[layer];
  }

  set(layer: LayerName, value: number) {
    this.overrides[layer] = value;
  }

  reset(layer?: LayerName) {
    if (layer) {
      delete this.overrides[layer];
    } else {
      this.overrides = {};
    }
  }
}

const manager = new ZIndexManager();

export const getLayerZIndex = (layer: LayerName) => manager.get(layer);

export const overrideLayerZIndex = (layer: LayerName, value: number) => {
  manager.set(layer, value);
};

export const resetLayerZIndex = (layer?: LayerName) => {
  manager.reset(layer);
};

export type { LayerName };
export default manager;
