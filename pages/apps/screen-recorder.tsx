import dynamic from 'next/dynamic';

const ScreenRecorder = dynamic(
  () => import('../../components/apps/screen-recorder'),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

export default ScreenRecorder;
