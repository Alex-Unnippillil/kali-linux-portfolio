"use client";

import { useEffect, useState } from 'react';

export default function useScrollSpy(ids = [], offset = 0) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const onScroll = () => {
      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= offset && rect.bottom > offset) {
          current = id;
          break;
        }
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ids, offset]);

  return activeId;
}

