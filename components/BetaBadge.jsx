import { useEffect, useState } from 'react';

const STORAGE_KEY = 'beta-badge-dismissed';

export default function BetaBadge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SHOW_BETA !== '1') return;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore persistence errors
    }
  };

  if (!visible) return null;

  return (
    <div
      data-testid="beta-badge"
      className="fixed bottom-4 right-4 rounded bg-yellow-500/90 px-2 py-1 text-xs font-semibold text-black"
    >
      <span>Beta</span>
      <button
        type="button"
        aria-label="Dismiss beta badge"
        className="ml-2"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
