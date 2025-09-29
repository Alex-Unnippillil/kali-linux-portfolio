import dynamic from '@/utils/dynamic';

const SSHPreview = dynamic(() => import('../../apps/ssh'));

export default function SSHPage() {
  return <SSHPreview />;
}
