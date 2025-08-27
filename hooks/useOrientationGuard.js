import { useState, useEffect } from 'react';

export default function useOrientationGuard(required = 'landscape') {
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(orientation: ${required})`);
    const update = () => setAllowed(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [required]);

  const Overlay = allowed ? null : (
    <div className="fixed inset-0 z-50 bg-black text-white flex items-center justify-center">
      Please rotate your device
    </div>
  );

  return { allowed, Overlay };
}
