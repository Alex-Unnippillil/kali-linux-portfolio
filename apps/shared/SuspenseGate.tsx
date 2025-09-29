'use client';

import { PropsWithChildren, useMemo } from 'react';

interface SuspenseGateProps {
  active: boolean;
}

export default function SuspenseGate({
  active,
  children,
}: PropsWithChildren<SuspenseGateProps>) {
  const blocker = useMemo(() => {
    if (!active) return null;
    return new Promise<void>(() => {});
  }, [active]);

  if (blocker) {
    throw blocker;
  }

  return <>{children}</>;
}
