import { useEffect, useState } from 'react';

// Returns true when the device is in landscape mode
export default function useOrientationGuard() {
  const [ok, setOk] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= window.innerHeight;
  });

  useEffect(() => {
    const check = () => setOk(window.innerWidth >= window.innerHeight);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return ok;
}
