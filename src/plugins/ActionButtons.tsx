import React, { useEffect, useState } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  SessionAction,
  listSessionActions,
  executeSessionAction,
} from '../lib/session/actions';

/**
 * Renders a set of buttons for performing session actions.
 * Actions are fetched from the session actions API.
 */
const ActionButtons: React.FC = () => {
  const [actions, setActions] = useState<SessionAction[]>([]);
  const [pending, setPending] = useState<SessionAction | null>(null);

  useEffect(() => {
    (async () => {
      const list = await listSessionActions();
      setActions(list);
    })();
  }, []);

  const triggerAction = async (action: SessionAction) => {
    if (action.confirm) {
      setPending(action);
    } else {
      await executeSessionAction(action.id);
    }
  };

  const confirm = async () => {
    if (pending) {
      await executeSessionAction(pending.id);
      setPending(null);
    }
  };

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          className="px-3 py-1 rounded bg-gray-800 text-white hover:bg-gray-700"
          onClick={() => triggerAction(action)}
        >
          {action.label}
        </button>
      ))}
      <ConfirmDialog
        open={!!pending}
        message={pending?.confirm || ''}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
};

export default ActionButtons;
