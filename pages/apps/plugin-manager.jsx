import dynamic from 'next/dynamic';

const PluginManagerApp = dynamic(() => import('../../apps/plugin-manager'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function PluginManagerPage() {
  return <PluginManagerApp />;
}
