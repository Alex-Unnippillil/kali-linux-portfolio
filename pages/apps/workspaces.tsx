import dynamic from 'next/dynamic';

const WorkspacePage = dynamic(() => import('../../apps/workspaces'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default WorkspacePage;
