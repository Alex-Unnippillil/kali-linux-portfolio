'use client';

import React, { useMemo, useState } from 'react';
import kioskManager, { KioskProfile } from '../../modules/kiosk/manager';
import useKiosk from '../../hooks/useKiosk';

interface Props {
  compact?: boolean;
}

interface FormState {
  name: string;
  allowedApps: string;
  disableContextMenus: boolean;
  disableAppSwitching: boolean;
  disableQuickSettings: boolean;
  exitSecret: string;
}

const defaultForm: FormState = {
  name: '',
  allowedApps: '',
  disableContextMenus: true,
  disableAppSwitching: true,
  disableQuickSettings: false,
  exitSecret: '',
};

const parseList = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const KioskProfilePanel: React.FC<Props> = ({ compact }) => {
  const { profiles, activeProfile, restrictions } = useKiosk();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [exitValue, setExitValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const sortedProfiles = useMemo(
    () => profiles.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [profiles],
  );

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const allowed = parseList(form.allowedApps);
    const exitSecret = form.exitSecret.trim();
    kioskManager.createProfile({
      name: form.name || 'Kiosk Profile',
      allowedApps: allowed,
      restrictions: {
        disableContextMenus: form.disableContextMenus,
        disableAppSwitching: form.disableAppSwitching,
        disableQuickSettings: form.disableQuickSettings,
      },
      exitCredentials: {
        type: exitSecret.length > 4 ? 'password' : 'pin',
        secret: exitSecret,
      },
    });
    setForm(defaultForm);
    setMessage('Profile created');
  };

  const handleDelete = (profile: KioskProfile) => {
    kioskManager.deleteProfile(profile.id);
    setMessage(`Removed ${profile.name}`);
  };

  const handleActivate = (profile: KioskProfile) => {
    kioskManager.activateProfile(profile.id);
    setMessage(`Activated ${profile.name}`);
  };

  const handleExport = () => {
    const data = kioskManager.exportProfiles();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kiosk-profiles.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport: React.ChangeEventHandler<HTMLInputElement> = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    kioskManager.importProfiles(text);
    event.target.value = '';
    setMessage('Imported kiosk profiles');
  };

  const handleExit = (event: React.FormEvent) => {
    event.preventDefault();
    const ok = kioskManager.deactivateProfile(exitValue.trim());
    if (!ok) {
      setMessage('Invalid kiosk credentials');
      return;
    }
    setExitValue('');
    setMessage('Kiosk mode disabled');
  };

  return (
    <section
      aria-label="Kiosk profiles"
      className={`rounded border border-gray-800 bg-black bg-opacity-40 text-white ${compact ? 'p-3' : 'p-5 mt-6'}`}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kiosk Profiles</h2>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className="rounded bg-ub-orange px-2 py-1 text-black"
            onClick={handleExport}
          >
            Export
          </button>
          <label className="rounded bg-ub-orange px-2 py-1 text-black cursor-pointer">
            Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>
      </header>
      {message && <p className="mb-2 text-xs text-ubt-grey">{message}</p>}
      <form onSubmit={handleCreate} className="mb-4 space-y-2 text-sm">
        <div className="flex flex-col">
          <label className="mb-1 font-medium" htmlFor="kiosk-name">
            Profile name
          </label>
          <input
            id="kiosk-name"
            value={form.name}
            onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
            className="rounded bg-ub-cool-grey px-2 py-1 text-white"
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 font-medium" htmlFor="kiosk-apps">
            Allowed apps (comma separated IDs)
          </label>
          <input
            id="kiosk-apps"
            value={form.allowedApps}
            onChange={event => setForm(current => ({ ...current, allowedApps: event.target.value }))}
            className="rounded bg-ub-cool-grey px-2 py-1 text-white"
            placeholder="settings, weather"
          />
        </div>
        <fieldset className="grid gap-2 md:grid-cols-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.disableContextMenus}
              onChange={event =>
                setForm(current => ({ ...current, disableContextMenus: event.target.checked }))
              }
            />
            Disable context menus
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.disableAppSwitching}
              onChange={event =>
                setForm(current => ({ ...current, disableAppSwitching: event.target.checked }))
              }
            />
            Disable app switching
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.disableQuickSettings}
              onChange={event =>
                setForm(current => ({ ...current, disableQuickSettings: event.target.checked }))
              }
            />
            Disable quick settings
          </label>
        </fieldset>
        <div className="flex flex-col">
          <label className="mb-1 font-medium" htmlFor="kiosk-exit">
            Exit PIN or password
          </label>
          <input
            id="kiosk-exit"
            type="password"
            value={form.exitSecret}
            onChange={event => setForm(current => ({ ...current, exitSecret: event.target.value }))}
            className="rounded bg-ub-cool-grey px-2 py-1 text-white"
          />
        </div>
        <button type="submit" className="rounded bg-ub-orange px-3 py-1 text-black">
          Save profile
        </button>
      </form>

      <div className="space-y-3 text-sm">
        {sortedProfiles.length === 0 && <p>No kiosk profiles configured.</p>}
        {sortedProfiles.map(profile => {
          const active = profile.id === activeProfile?.id;
          return (
            <article
              key={profile.id}
              className={`rounded border border-gray-700 p-3 ${active ? 'bg-ub-cool-grey bg-opacity-40' : 'bg-transparent'}`}
            >
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{profile.name}</h3>
                  <p className="text-xs text-ubt-grey">Allowed: {profile.allowedApps.join(', ') || 'All apps'}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="rounded bg-ub-orange px-2 py-1 text-black disabled:opacity-50"
                    onClick={() => handleActivate(profile)}
                    disabled={active}
                  >
                    {active ? 'Active' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-700 px-2 py-1"
                    onClick={() => handleDelete(profile)}
                  >
                    Remove
                  </button>
                </div>
              </header>
              <ul className="mt-2 space-y-1 text-xs text-ubt-grey">
                <li>Context menus: {profile.restrictions.disableContextMenus ? 'Disabled' : 'Allowed'}</li>
                <li>App switching: {profile.restrictions.disableAppSwitching ? 'Disabled' : 'Allowed'}</li>
                <li>Quick settings: {profile.restrictions.disableQuickSettings ? 'Disabled' : 'Allowed'}</li>
              </ul>
            </article>
          );
        })}
      </div>

      {activeProfile && (
        <form onSubmit={handleExit} className="mt-4 space-y-2 border-t border-gray-800 pt-3 text-sm">
          <h3 className="font-semibold">Exit kiosk mode</h3>
          <p className="text-xs text-ubt-grey">
            Active profile: {activeProfile.name}. Context menus are
            {restrictions.disableContextMenus ? ' disabled' : ' enabled'}, app switching is
            {restrictions.disableAppSwitching ? ' disabled' : ' enabled'}.
          </p>
          <label className="flex flex-col gap-1" htmlFor="kiosk-exit-confirm">
            Enter credentials to exit
            <input
              id="kiosk-exit-confirm"
              type={activeProfile.exitCredentials.type === 'password' ? 'password' : 'tel'}
              value={exitValue}
              onChange={event => setExitValue(event.target.value)}
              className="rounded bg-ub-cool-grey px-2 py-1 text-white"
            />
          </label>
          <button type="submit" className="rounded bg-ub-orange px-3 py-1 text-black">
            Exit kiosk
          </button>
        </form>
      )}
    </section>
  );
};

export default KioskProfilePanel;
