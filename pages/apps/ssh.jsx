import dynamic from '@/utils/dynamic';

const SSHPreview = dynamic(() => import('@/apps/ssh'), {
  ssr: false,
});

export default function SSHPage() {
  return <SSHPreview />;
}
