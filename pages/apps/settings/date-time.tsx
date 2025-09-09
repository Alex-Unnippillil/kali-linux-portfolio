import dynamic from 'next/dynamic';

const DateTimeSettings = dynamic(
  () => import('../../../apps/settings/date-time'),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default DateTimeSettings;

