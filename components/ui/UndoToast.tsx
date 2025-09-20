import Toast from './Toast';
import type { SettingsHistoryEntry } from '../../middleware/settingsHistory';

interface UndoToastProps {
  entry: SettingsHistoryEntry | null;
  onUndo: (entry: SettingsHistoryEntry) => void | Promise<void>;
  onDismiss: () => void;
  duration?: number;
}

const UndoToast: React.FC<UndoToastProps> = ({
  entry,
  onUndo,
  onDismiss,
  duration,
}) => {
  if (!entry) return null;

  const handleUndo = () => {
    Promise.resolve(onUndo(entry)).catch((error) => {
      console.error('Failed to undo settings change', error);
    });
    onDismiss();
  };

  return (
    <Toast
      message={entry.summary}
      actionLabel="Undo"
      onAction={handleUndo}
      onClose={onDismiss}
      duration={duration}
    />
  );
};

export default UndoToast;
