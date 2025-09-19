import dynamic from 'next/dynamic';

const BleSensor = dynamic(() => import('../../components/apps/ble-sensor'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default BleSensor;
