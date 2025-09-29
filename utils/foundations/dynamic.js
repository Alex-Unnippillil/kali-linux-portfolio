// FND-03 — wrapper for lazily loading heavy client-only modules
import dynamic from 'next/dynamic';

export const createHeavyComponent = (importer, options = {}) =>
  dynamic(
    async () => {
      const mod = await importer();
      if (mod && typeof mod === 'object' && 'default' in mod) {
        return mod;
      }

      return { default: mod };
    },
    {
      ssr: false,
      loading: options.loading,
    }
  );

