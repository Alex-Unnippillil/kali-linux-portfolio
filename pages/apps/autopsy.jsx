import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import AppWindowSkeleton from '../../components/ui/AppWindowSkeleton';

const Autopsy = dynamic(() => import('../../apps/autopsy'), {
  ssr: false,
  suspense: true,
});

export default function AutopsyPage() {
  return (
    <Suspense
      fallback={
        <AppWindowSkeleton
          title="Autopsy"
          description="Mounting evidence timeline"
        />
      }
    >
      <Autopsy />
    </Suspense>
  );
}
