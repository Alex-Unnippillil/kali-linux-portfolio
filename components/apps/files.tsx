import dynamic from 'next/dynamic';

const FilesApp = dynamic(() => import('../../apps/files'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading Files...
    </div>
  ),
});

export default function Files() {
  return <FilesApp />;
}
