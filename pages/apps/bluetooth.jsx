import dynamic from 'next/dynamic';

const BluetoothApp = dynamic(() => import('../../apps/bluetooth'), {
  ssr: false,
  loading: () => <p className="p-4 text-slate-200">Loading Bluetooth lab…</p>,
});

export default function BluetoothPage() {
  return <BluetoothApp />;
}
