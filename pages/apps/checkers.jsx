import React from 'react';
import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Checkers = dynamic(() => import('../../apps/checkers'), {
  ssr: false,
  loading: () => getAppSkeleton('checkers', 'Checkers'),
});

export default function CheckersPage() {
  return <Checkers />;
}
