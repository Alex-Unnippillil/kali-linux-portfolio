import dynamic from 'next/dynamic';

const BluetoothApp = dynamic(() => import('@/apps/bluetooth'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BluetoothPage() {
  return <BluetoothApp />;
}

