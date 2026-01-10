import React from 'react';
import dynamic from 'next/dynamic';

const Blackjack = dynamic(() => import('../../components/apps/blackjack'), { ssr: false });

export default function BlackjackPage() {
  return <Blackjack />;
}
