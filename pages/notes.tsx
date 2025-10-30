import dynamic from 'next/dynamic';

const NotesApp = dynamic(
  () => import(/* webpackPrefetch: true */ '../components/notes/NotesClient'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-ub-cool-grey text-white">
        <p className="animate-pulse text-sm tracking-wide">Loading notes…</p>
      </div>
    ),
  },
);

export default function NotesPage() {
  return <NotesApp />;
}
