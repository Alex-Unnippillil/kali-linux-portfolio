import dynamic from 'next/dynamic';

const SettingsApp = dynamic(() => import('../../../apps/settings'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      Loading Settings...
    </div>
  ),
});

export const displaySettings = () => <SettingsApp />;

export default SettingsApp;
