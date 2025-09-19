import dynamic from 'next/dynamic';

const LogViewer = dynamic(() => import('../../apps/log-viewer'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default LogViewer;

export const displayLogViewer = (addFolder, openApp) => (
  <LogViewer addFolder={addFolder} openApp={openApp} />
);
