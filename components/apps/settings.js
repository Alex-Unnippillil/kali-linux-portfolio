"use client";

import SettingsApp from '../../apps/settings';

export function Settings(props) {
  return <SettingsApp {...props} />;
}

export default Settings;

export const displaySettings = () => <Settings />;
