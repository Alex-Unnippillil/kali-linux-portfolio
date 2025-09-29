export interface Module {
  name: string;
  description: string;
  type: string;
  severity: string;
  platform?: string;
  tags?: string[];
  [key: string]: unknown;
}

export type ModuleSource = 'cache' | 'seed';

export interface ModuleCachePayload {
  revision: string;
  modules: Module[];
}
