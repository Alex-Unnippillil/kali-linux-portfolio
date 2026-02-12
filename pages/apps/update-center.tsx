import dynamic from 'next/dynamic';

const UpdateCenter = dynamic(() => import('../../components/apps/update-center'), {
  ssr: false,
  loading: () => <p className="p-4 text-white">Loading Update Center…</p>,
});

export default function UpdateCenterPage() {
  return (
    <div className="w-full h-full bg-ub-dark text-white">
      <UpdateCenter />
    </div>
  );
}
