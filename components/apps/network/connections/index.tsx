import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const NetworkConnections: ComponentType = dynamic(
  () => import('../../../apps/network/connections'),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

export default NetworkConnections;
