import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const SSHPreview = dynamic(() => import('../../apps/ssh'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function SSHPage() {
  return <SSHPreview />;
}
