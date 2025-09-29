import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import AppWindowSkeleton from '../../components/ui/AppWindowSkeleton';

const Ghidra = dynamic(() => import('../../apps/ghidra'), {
  ssr: false,
  suspense: true,
});

export default function GhidraPage() {
  return (
    <Suspense
      fallback={
        <AppWindowSkeleton
          title="Ghidra"
          description="Bootstrapping reverse engineering workspace"
        />
      }
    >
      <Ghidra />
    </Suspense>
  );
}
