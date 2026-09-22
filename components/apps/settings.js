import React from 'react';
import SettingsCenter from './settings/SettingsCenter';

// The launcher and standalone route share a single settings implementation.
export const Settings = SettingsCenter;
export default SettingsCenter;
export const displaySettings = () => <SettingsCenter />;
