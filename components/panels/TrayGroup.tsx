import React from 'react';
import { useNotifications } from '../../store/notifications';

/**
 * TrayGroup shows a DND toggle and indicates the number of muted
 * notifications while DND is active.
 */
const TrayGroup: React.FC = () => {
  const { dnd, toggleDnd, mutedCount } = useNotifications();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={dnd}
        onClick={toggleDnd}
        className="relative px-2 py-1 bg-ub-grey text-black rounded"
      >
        {dnd ? 'DND On' : 'DND Off'}
        {mutedCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">
            {mutedCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default TrayGroup;
