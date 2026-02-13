import Head from 'next/head';
import dynamic from 'next/dynamic';

const ModulePlanner = dynamic(
  () => import('../../apps/recon-ng/components/ModulePlanner'),
  { ssr: false },
);

const ReconNgDependencyGraph = () => (
  <>
    <Head>
      <title>Recon-ng Module Planner</title>
    </Head>
    <div className="min-h-screen bg-gray-900 text-white">
      <ModulePlanner />
    </div>
  </>
);

export default ReconNgDependencyGraph;
