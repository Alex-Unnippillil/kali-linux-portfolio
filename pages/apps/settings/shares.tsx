import { useEffect, useState } from 'react';
import ToggleSwitch from '../../../components/ToggleSwitch';

interface ShareEntry {
  name: string;
  enabled: boolean;
}

export default function ShareSettings() {
  const [shares, setShares] = useState<ShareEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/data/shared-folders.json');
        const data: ShareEntry[] = await res.json();
        let stored: Record<string, boolean> = {};
        try {
          stored = JSON.parse(localStorage.getItem('shares') || '{}');
        } catch {}
        setShares(
          data.map((s) => ({ ...s, enabled: stored[s.name] ?? s.enabled }))
        );
      } catch {
        setShares([]);
      }
    };
    load();
  }, []);

  const toggleShare = (name: string) => {
    setShares((prev) => {
      const next = prev.map((s) =>
        s.name === name ? { ...s, enabled: !s.enabled } : s
      );
      const store = Object.fromEntries(next.map((s) => [s.name, s.enabled]));
      try {
        localStorage.setItem('shares', JSON.stringify(store));
      } catch {}
      window.dispatchEvent(new CustomEvent('shares-updated', { detail: store }));
      return next;
    });
  };

  return (
    <div className="p-4 space-y-2">
      {shares.map((s) => (
        <div
          key={s.name}
          className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0"
        >
          <span>{s.name}</span>
          <div className="flex items-center space-x-2">
            {s.enabled && (
              <span className="text-xs text-green-400">Available on LAN</span>
            )}
            <ToggleSwitch
              checked={s.enabled}
              onChange={() => toggleShare(s.name)}
              ariaLabel={`Toggle ${s.name}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
