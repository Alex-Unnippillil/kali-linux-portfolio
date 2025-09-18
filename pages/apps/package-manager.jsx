import dynamic from 'next/dynamic';

const PackageManagerApp = dynamic(() => import('../../apps/package-manager'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-900 text-white">
      Loading Package Manager...
    </div>
  ),
});

export default function PackageManagerPage() {
  return <PackageManagerApp />;
}
