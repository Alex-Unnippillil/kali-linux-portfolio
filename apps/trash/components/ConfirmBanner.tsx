import { useEffect } from 'react';

interface ConfirmBannerProps {
  onUndo: () => void;
  onClose: () => void;
  message?: string;
  duration?: number;
}

export default function ConfirmBanner({
  onUndo,
  onClose,
  message = 'Trash emptied',
  duration = 5000,
}: ConfirmBannerProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow flex items-center space-x-4">
      <span>{message}</span>
      <button
        onClick={onUndo}
        className="underline focus:outline-none"
      >
        Undo
      </button>
    </div>
  );
}
