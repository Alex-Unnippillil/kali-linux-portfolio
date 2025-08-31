import React from 'react';
import nextDynamic, { DynamicOptions } from 'next/dynamic';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function dynamic<P = unknown>(
  loader: Parameters<typeof nextDynamic<P>>[0],
  options: DynamicOptions<P> = {}
) {
  return nextDynamic(loader, {
    ssr: false,
    loading: () => <LoadingSkeleton />,
    ...options,
  });
}
