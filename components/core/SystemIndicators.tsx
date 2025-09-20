import React, { useEffect, useState } from 'react';
import {
  getFullscreenState,
  subscribeToFullscreenChanges,
} from '../../modules/desktop/fullscreenManager';

const SystemIndicators: React.FC = () => {
  const [silenced, setSilenced] = useState(
    () => getFullscreenState().silenceNotifications,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return subscribeToFullscreenChanges(state => {
      setSilenced(state.silenceNotifications);
    });
  }, []);

  if (!silenced) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Notifications silenced while fullscreen is active"
      className="flex items-center gap-1 text-xs text-ubt-grey-light opacity-80"
    >
      <span aria-hidden="true" className="text-sm leading-none">
        🔕
      </span>
      <span className="hidden md:inline">Silenced</span>
    </div>
  );
};

export default SystemIndicators;
