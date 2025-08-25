import dynamic from 'next/dynamic';

// Load the Twitter timeline client-side only
const Timeline = dynamic(
  () => import('react-twitter-widgets').then((m) => m.Timeline),
  { ssr: false }
);

export default function XApp() {
  return (
    <div className="h-full w-full overflow-auto bg-panel">
      <Timeline
        dataSource={{ sourceType: 'profile', screenName: 'AUnnippillil' }}
        options={{ chrome: 'noheader noborders', theme: 'dark' }}
      />
    </div>
  );
}

export const displayX = () => <XApp />;

