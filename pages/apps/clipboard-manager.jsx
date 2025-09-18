import dynamic from 'next/dynamic';

const ClipboardManagerApp = dynamic(
  () =>
    import('../../components/apps/ClipboardManager').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

export default function ClipboardManagerPage() {
  return (
    <main className="min-h-screen bg-ub-cool-grey p-4 text-white">
      <ClipboardManagerApp />
    </main>
  );
}

