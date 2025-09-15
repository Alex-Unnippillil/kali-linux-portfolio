import { useEffect, useState } from 'react';

export default function useDelayedRender(active: boolean, delay = 400) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);

  return show;
}
