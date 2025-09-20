import { useEffect } from 'react';

import wm, { WORKSPACES } from './wm';

const WorkspaceHotkeys = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.altKey || event.metaKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      event.preventDefault();

      const { ws } = wm.getState();
      const currentIndex = WORKSPACES.indexOf(ws);
      if (currentIndex === -1) return;

      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = (currentIndex + direction + WORKSPACES.length) % WORKSPACES.length;
      const nextWorkspace = WORKSPACES[nextIndex];

      wm.setWs(nextWorkspace);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  return null;
};

export default WorkspaceHotkeys;
