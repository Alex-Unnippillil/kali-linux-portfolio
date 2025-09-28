import demoManifest from '../plugins/catalog/demo.json';

export interface PluginManifest {
  id: string;
  sandbox: 'worker' | 'iframe';
  code: string;
}

export interface PluginDescriptor {
  id: string;
  file: string;
}

export const staticPluginCatalog: PluginDescriptor[] = [
  {
    id: demoManifest.id,
    file: 'demo.json',
  },
];

export const staticPluginManifests: Record<string, PluginManifest> = {
  'demo.json': demoManifest as PluginManifest,
};
