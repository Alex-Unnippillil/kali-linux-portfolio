import dynamic from 'next/dynamic';

const ClipboardManagerApp = dynamic(() => import('../../components/apps/ClipboardManager'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-200">
      <p className="text-sm">Loading Clipboard Manager…</p>
    </div>
  ),
});

export default function ClipboardManagerPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ClipboardManagerApp />
    </div>
  );
}
