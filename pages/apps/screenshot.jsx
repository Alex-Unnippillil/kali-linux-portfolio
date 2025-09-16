import dynamic from 'next/dynamic';

const ScreenshotApp = dynamic(() => import('../../apps/screenshot'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function ScreenshotPage() {
  return <ScreenshotApp />;
}
