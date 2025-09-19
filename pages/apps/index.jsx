import dynamic from 'next/dynamic';
import { useCallback } from 'react';
import { useRouter } from 'next/router';

const AppGrid = dynamic(() => import('../../components/apps/app-grid'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-ub-grey text-white">
      Loading applications…
    </div>
  ),
});

const AppsPage = () => {
  const router = useRouter();
  const handleOpenApp = useCallback(
    (id) => {
      if (!id) return;
      void router.push(`/apps/${id}`);
    },
    [router]
  );

  return (
    <div className="flex min-h-screen flex-col bg-ub-grey text-white">
      <main className="flex flex-1 flex-col">
        <AppGrid openApp={handleOpenApp} />
      </main>
    </div>
  );
};

export default AppsPage;
