import dynamic from 'next/dynamic';
import React from 'react';

const NotificationsApp = dynamic(() => import('../../apps/notifications'), {
  ssr: false,
  loading: () => (
    <p className="p-6 text-center text-sm text-ubt-grey" role="status">
      Loading notification center…
    </p>
  ),
});

const NotificationsPage: React.FC = () => {
  return <NotificationsApp />;
};

export default NotificationsPage;
