import { useEffect, useState } from 'react';

type Orientation = 'portrait' | 'landscape';

const getOrientation = (): Orientation => {
  if (typeof window === 'undefined') {
    return 'landscape';
  }

  if (window.screen?.orientation?.type) {
    const type = window.screen.orientation.type;
    if (type.includes('portrait')) {
      return 'portrait';
    }
    if (type.includes('landscape')) {
      return 'landscape';
    }
  }

  return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
};

export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(getOrientation);

  useEffect(() => {
    const handleChange = () => setOrientation(getOrientation());

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('resize', handleChange);

    const screenOrientation = window.screen?.orientation;
    screenOrientation?.addEventListener?.('change', handleChange);

    return () => {
      window.removeEventListener('resize', handleChange);
      screenOrientation?.removeEventListener?.('change', handleChange);
    };
  }, []);

  return orientation;
}

export default useOrientation;
