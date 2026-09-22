import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clear, get, set } from 'idb-keyval';
import { Settings } from '../components/apps/settings';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { PROFILES_KEY, WORKSPACE_KEY, SNAPSHOT_DEFAULTS } from '../lib/settings/model';
import * as settingsStore from '../utils/settingsStore';

function StateProbe() {
  const settings = useSettings();
  return <output data-testid="preferences-state">{JSON.stringify({
    ...Object.fromEntries(Object.keys(SNAPSHOT_DEFAULTS).map(key => [key, settings[key as keyof typeof settings]])),
    ...settings.workspacePreferences,
    allowNetwork: settings.allowNetwork,
  })}</output>;
}
const state = () => JSON.parse(screen.getByTestId('preferences-state').textContent || '{}');
const persisted = {
  density: 'compact', 'reduced-motion': 'true', 'font-scale': '1.5',
  'high-contrast': 'true', 'large-hit-areas': 'true', 'pong-spin': 'false',
  'allow-network': 'true', haptics: 'false', 'use-kali-wallpaper': 'true',
  volume: '25', 'app:theme': 'dark',
};
const profile = JSON.stringify({ version: 1, profiles: [{ id: 'work', name: 'Work', settings: SNAPSHOT_DEFAULTS }] });

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
beforeEach(async () => {
  await clear(); localStorage.clear();
  for (const [key, value] of Object.entries(persisted)) localStorage.setItem(key, value);
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ clockFormat: '24', showSeconds: true, wallpaperDim: 45, strongFocus: true }));
  localStorage.setItem(PROFILES_KEY, profile);
  localStorage.setItem('youtube:watch-later', '["saved-video"]');
  localStorage.setItem('notes-test', 'keep my draft');
  await set('accent', '#e53e3e'); await set('bg-image', 'wall-3');
  await set('other-app-data', { progress: 12 });
});
afterEach(async () => { cleanup(); await clear(); localStorage.clear(); });
async function setup() {
  const user = userEvent.setup();
  const view = render(<SettingsProvider><Settings /><StateProbe /></SettingsProvider>);
  await waitFor(() => expect(screen.getByRole('slider', { name: 'App volume' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Profiles & backup', exact: true }));
  return { user, ...view };
}

test('confirmed reset restores every desktop preference, revokes optional networking, and preserves app data and profiles', async () => {
  const { user, unmount } = await setup();
  expect(state()).toMatchObject({ density: 'compact', fontScale: 1.5, accent: '#e53e3e', volume: 25, allowNetwork: true });
  await user.click(screen.getByRole('button', { name: 'Reset preferences…' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  expect(state().volume).toBe(25);
  await user.click(within(dialog).getByRole('button', { name: 'Reset preferences', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(state()).toEqual({ ...SNAPSHOT_DEFAULTS, allowNetwork: false });
  await waitFor(async () => expect(await get('accent')).toBe(SNAPSHOT_DEFAULTS.accent));
  await expect(get('bg-image')).resolves.toBe(SNAPSHOT_DEFAULTS.wallpaper);
  await expect(settingsStore.getAllowNetwork()).resolves.toBe(false);
  expect(localStorage.getItem(PROFILES_KEY)).toBe(profile);
  expect(localStorage.getItem('youtube:watch-later')).toBe('["saved-video"]');
  expect(localStorage.getItem('notes-test')).toBe('keep my draft');
  await expect(get('other-app-data')).resolves.toEqual({ progress: 12 });
  // Reopen the real provider to prove persisted outcomes, not just React state.
  unmount();
  render(<SettingsProvider><Settings /><StateProbe /></SettingsProvider>);
  await waitFor(() => expect(screen.getByRole('slider', { name: 'App volume' })).toBeEnabled());
  expect(state()).toEqual({ ...SNAPSHOT_DEFAULTS, allowNetwork: false });
});

test('cancelling reset preserves both storage layers and restores trigger focus', async () => {
  const { user } = await setup();
  const before = state();
  const trigger = screen.getByRole('button', { name: 'Reset preferences…' });
  await user.click(trigger);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(state()).toEqual(before);
  expect(trigger).toHaveFocus();
  for (const [key, value] of Object.entries(persisted)) expect(localStorage.getItem(key)).toBe(value);
  await expect(get('accent')).resolves.toBe('#e53e3e');
  await expect(get('bg-image')).resolves.toBe('wall-3');
});
