import type { ComponentType } from 'react';
import apps from '../apps.config';

export interface AppMetadata {
  id: string;
  title: string;
  icon: string;
  importer: () => Promise<{ default: ComponentType<any> }>;
}

type LegacyApp = {
  id: string;
  title: string;
  icon: string;
  importer?: () => Promise<any>;
  screen?: {
    importer?: () => Promise<any>;
  };
};

const withDefaultImporter = (app: LegacyApp): AppMetadata => {
  const importer =
    app.importer ||
    app.screen?.importer ||
    (() => import(/* webpackPrefetch: true */ `../components/apps/${app.id}`));

  return {
    id: app.id,
    title: app.title,
    icon: app.icon,
    importer: async () => {
      const mod = await importer();
      if ('default' in mod) {
        return mod;
      }
      return { default: mod as ComponentType<any> };
    },
  };
};

export const appRegistry: AppMetadata[] = (apps as LegacyApp[]).map((app) =>
  withDefaultImporter(app)
);

export const getAppMetadata = (id: string): AppMetadata | undefined =>
  appRegistry.find((app) => app.id === id);

export default appRegistry;
