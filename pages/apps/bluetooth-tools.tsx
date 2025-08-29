import dynamic from 'next/dynamic';

const BluetoothToolsApp = dynamic(() => import('../../apps/bluetooth-tools'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BluetoothToolsPage() {
  return <BluetoothToolsApp />;
}
