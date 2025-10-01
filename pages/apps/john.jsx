import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import ViewportHydrator from '../../components/common/ViewportHydrator';

const John = dynamic(() => import('../../apps/john'), {
  ssr: false,
  suspense: true,
});

const fallback = (
  <div className="flex flex-1 items-center justify-center px-4 py-12 text-sm text-white/70">
    Spooling password auditor…
  </div>
);

export default function JohnPage({ shell = { title: 'John the Ripper (Simulated)', description: '' } }) {
  const { title, description } = shell;
  return (
    <div className="flex h-full flex-col bg-[var(--kali-bg)] text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-semibold">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-white/70">{description}</p>
        ) : null}
      </header>
      <Suspense fallback={fallback}>
        <ViewportHydrator
          className="flex flex-1"
          fallback={fallback}
          metricName="john-island"
        >
          {() => <John />}
        </ViewportHydrator>
      </Suspense>
    </div>
  );
}

export const getStaticProps = async () => ({
  props: {
    shell: {
      title: 'John the Ripper (Simulated)',
      description: 'Hydrates only when the password audit viewport scrolls into view.',
    },
  },
  revalidate: 3600,
});
