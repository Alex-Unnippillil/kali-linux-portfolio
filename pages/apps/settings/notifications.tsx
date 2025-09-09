import dynamic from 'next/dynamic';

const NotificationsSettings = dynamic(
  () => import('../../../apps/settings/notifications'),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default NotificationsSettings;

