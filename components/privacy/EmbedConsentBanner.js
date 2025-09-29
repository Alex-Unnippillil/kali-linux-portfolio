import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSettings } from '../../hooks/useSettings';

export default function EmbedConsentBanner() {
  const { allowEmbeds, setAllowEmbeds } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem('embed-consent-dismissed');
    setDismissed(stored === 'true');
  }, []);

  useEffect(() => {
    if (allowEmbeds) {
      setDismissed(true);
    }
  }, [allowEmbeds]);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('embed-consent-dismissed', 'true');
    }
  };

  if (allowEmbeds || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-ubt-cool-grey bg-ub-cool-grey/95 p-4 text-sm shadow-lg backdrop-blur">
      <p className="text-ubt-grey">
        Embedded tweets and tools are blocked until you opt in. Enable embeds to load third-party scripts or review the{' '}
        <Link href="/docs/embed-consent" className="underline">
          embed consent guide
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-ub-orange px-3 py-1 text-black transition hover:bg-ub-orange/80"
          onClick={() => setAllowEmbeds(true)}
        >
          Enable embeds
        </button>
        <button
          type="button"
          className="rounded border border-ubt-grey px-3 py-1 text-ubt-grey transition hover:bg-ub-grey/60"
          onClick={dismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
