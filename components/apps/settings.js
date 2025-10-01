import dynamic from 'next/dynamic';

const SettingsApp = dynamic(() => import('../../apps/settings'), {
  ssr: false,
});

export const displaySettings = (addFolder, openApp, context) => (
  <SettingsApp addFolder={addFolder} openApp={openApp} context={context} />
);

export const Settings = SettingsApp;

export default SettingsApp;
