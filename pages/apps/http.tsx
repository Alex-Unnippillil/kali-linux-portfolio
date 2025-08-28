import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const HTTPPreview = dynamic(() => import('../../apps/http'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function HTTPPage() {
  return <HTTPPreview />;
}
