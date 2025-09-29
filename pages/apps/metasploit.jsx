import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import AppWindowSkeleton from '../../components/ui/AppWindowSkeleton';

const Metasploit = dynamic(() => import('../../apps/metasploit'), {
  ssr: false,
  suspense: true,
});

export default function MetasploitPage() {
  return (
    <Suspense
      fallback={
        <AppWindowSkeleton
          title="Metasploit"
          description="Loading module catalog"
        />
      }
    >
      <Metasploit />
    </Suspense>
  );
}
