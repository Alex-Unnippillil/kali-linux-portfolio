import dynamic from 'next/dynamic';

const WebUSB = dynamic(() => import('../../components/apps/webusb'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default WebUSB;
