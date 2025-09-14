import React from 'react';

/**
 * Minimal title bar used when the Window Controls Overlay is visible.
 * Provides a draggable region for custom window buttons in supported browsers.
 */
const Titlebar: React.FC = () => {
  return <div style={{ height: '32px', WebkitAppRegion: 'drag' }} />;
};

export default Titlebar;

