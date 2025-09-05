import dynamic from 'next/dynamic';

const WindowManagerTweaksApp = dynamic(() => import('../../../apps/window-manager-tweaks'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default WindowManagerTweaksApp;
