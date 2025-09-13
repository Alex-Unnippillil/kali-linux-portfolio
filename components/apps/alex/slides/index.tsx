import { useCallback, useEffect, useState } from 'react';
import { usePipPortal } from '../../../common/PipPortal';
import slides from './data';

export default function AboutSlides() {
  const { open, close } = usePipPortal();
  const [index, setIndex] = useState(0);

  const show = useCallback(
    (i: number) => {
      const slide = slides[i];
      if (!slide) {
        close();
        return;
      }
      open(
        <div className="p-4 bg-black text-white text-sm">
          <h1 className="text-lg font-bold mb-2">{slide.title}</h1>
          <p>{slide.body}</p>
        </div>
      );
    },
    [open, close]
  );

  useEffect(() => {
    show(index);
  }, [index, show]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return null;
}
