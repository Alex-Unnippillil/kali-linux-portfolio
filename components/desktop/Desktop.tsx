"use client";

import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';

import LegacyDesktop from '../screen/desktop';
import { addPeekStateListener, initializePeekGestures } from '@/src/system/gestures';

type LegacyDesktopProps = ComponentProps<typeof LegacyDesktop>;

const applyPeekClass = (container: HTMLElement | null, active: boolean) => {
  if (!container) {
    return;
  }
  container.classList.toggle('desktop-peeking', active);
};

export default function Desktop(props: LegacyDesktopProps) {
  const [isPeeking, setIsPeeking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const removeListener = addPeekStateListener(({ active }) => {
      setIsPeeking(active);
    });

    const cleanupGestures = initializePeekGestures();

    return () => {
      removeListener();
      cleanupGestures();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const container = document.getElementById('window-area');
    applyPeekClass(container, isPeeking);

    return () => {
      applyPeekClass(container, false);
    };
  }, [isPeeking]);

  return <LegacyDesktop {...props} />;
}
