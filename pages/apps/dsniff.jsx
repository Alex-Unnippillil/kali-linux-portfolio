import dynamic from 'next/dynamic';

const DsniffLab = dynamic(() => import('../../components/apps/dsniff'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--kali-bg,#0f172a)] text-slate-200">
      Loading dsniff lab...
    </div>
  ),
});

export default function DsniffPage() {
  return <DsniffLab />;
}
