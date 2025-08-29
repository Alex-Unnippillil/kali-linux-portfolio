import { useEffect, useState } from 'react';
import { beta } from '../lib/flags';

export default function BetaBadge() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await beta();
        if (!cancelled) setEnabled(result);
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  return <span>Beta</span>;
}
