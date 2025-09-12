export type AppSizeConstraints = {
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
};

const registry: Record<string, AppSizeConstraints> = {
  terminal: { minW: 30, minH: 40 },
  calculator: { minW: 20, minH: 20, maxW: 60, maxH: 80 },
  settings: { minW: 30, minH: 30 }
};

export default registry;
