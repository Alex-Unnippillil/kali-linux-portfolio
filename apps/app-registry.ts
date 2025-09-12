import apps, { utilities } from '../apps.config';

// Enhance the base apps list by annotating utility apps with metadata
// needed by the window manager.
export const appRegistry = apps.map(app => {
  if (utilities.some(u => u.id === app.id)) {
    return { ...app, utility: true, preferred: [420, 560] as [number, number] };
  }
  return app;
});

export default appRegistry;
