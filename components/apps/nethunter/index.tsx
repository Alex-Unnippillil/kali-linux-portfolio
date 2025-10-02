import dynamic from 'next/dynamic';
import React from 'react';

const NetHunterApp = dynamic(() => import('../../../apps/nethunter'), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-gray-200">Loading NetHunter console…</div>
  ),
});

const NetHunter = () => <NetHunterApp />;

export const displayNetHunter = () => <NetHunter />;

export default NetHunter;
