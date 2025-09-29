import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import AppWindowSkeleton from '../../components/ui/AppWindowSkeleton';

const Volatility = dynamic(() => import('../../apps/volatility'), {
  ssr: false,
  suspense: true,
});

export default function VolatilityPage() {
  return (
    <Suspense
      fallback={
        <AppWindowSkeleton
          title="Volatility"
          description="Analyzing memory snapshot"
        />
      }
    >
      <Volatility />
    </Suspense>
  );
}
