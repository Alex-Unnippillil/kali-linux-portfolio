import { getPageMetadata } from '@/lib/metadata';
import React from 'react';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/checkers');

const Checkers = dynamic(() => import('../../apps/checkers'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function CheckersPage() {
  return <Checkers />;
}
