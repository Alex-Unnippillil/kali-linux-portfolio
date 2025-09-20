'use client';

import { ComponentPropsWithoutRef, ReactNode, useEffect, useState } from 'react';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

type FadeInOnMountProps = {
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>;

export default function FadeInOnMount({
  className = '',
  children,
  ...rest
}: FadeInOnMountProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [ready, setReady] = useState(() => prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setReady(true);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setReady(true);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [prefersReducedMotion]);

  const classes = ['app-shell'];
  if (className) classes.push(className);
  if (ready) classes.push('app-shell--ready');

  return (
    <div className={classes.join(' ')} {...rest}>
      {children}
    </div>
  );
}
