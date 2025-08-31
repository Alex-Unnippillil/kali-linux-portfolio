import React from 'react';
import dynamic from '@/utils/dynamic';

const Checkers = dynamic(() => import('@/apps/checkers'), {
  ssr: false,
});

export default function CheckersPage() {
  return <Checkers />;
}
