import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import AppWindowSkeleton from '../../components/ui/AppWindowSkeleton';

const MetasploitPost = dynamic(() => import('../../apps/metasploit-post'), {
  ssr: false,
  suspense: true,
});

export default function MetasploitPostPage() {
  return (
    <Suspense
      fallback={
        <AppWindowSkeleton
          title="Metasploit Post"
          description="Replaying post-exploitation scripts"
        />
      }
    >
      <MetasploitPost />
    </Suspense>
  );
}
