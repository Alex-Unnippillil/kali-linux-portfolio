'use client';

import { useState } from 'react';
import ToggleSwitch from '../../../components/ToggleSwitch';
import Toast from '../../../components/ui/Toast';

interface Settings {
  mountDrives: boolean;
  mountMedia: boolean;
  browseMedia: boolean;
  autoRun: boolean;
  cameraImportCommand: string;
}

export default function RemovableMediaPage() {
  const [settings, setSettings] = useState<Settings>({
    mountDrives: false,
    mountMedia: false,
    browseMedia: false,
    autoRun: false,
    cameraImportCommand: '',
  });
  const [toast, setToast] = useState('');

  const update = (partial: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...partial }));

  const insertDevice = () => {
    window.localStorage.setItem(
      'volume-event',
      JSON.stringify({
        type: 'insert',
        id: 'demo-usb',
        label: 'Demo USB',
        open: settings.browseMedia,
      }),
    );
    setToast(settings.autoRun ? 'Demo; no binaries executed' : 'Demo USB inserted');
  };

  const ejectDevice = () => {
    window.localStorage.setItem(
      'volume-event',
      JSON.stringify({ type: 'eject', id: 'demo-usb' }),
    );
  };

  return (
    <div className="p-space-2 text-white space-y-space-2">
      <div className="flex items-center justify-between">
        <span>Mount removable drives when hot-plugged</span>
        <ToggleSwitch
          checked={settings.mountDrives}
          onChange={(checked) => update({ mountDrives: checked })}
          ariaLabel="Mount removable drives when hot-plugged"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Mount removable media when inserted</span>
        <ToggleSwitch
          checked={settings.mountMedia}
          onChange={(checked) => update({ mountMedia: checked })}
          ariaLabel="Mount removable media when inserted"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Browse removable media when inserted</span>
        <ToggleSwitch
          checked={settings.browseMedia}
          onChange={(checked) => update({ browseMedia: checked })}
          ariaLabel="Browse removable media when inserted"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Auto-run programs on new drives and media</span>
        <ToggleSwitch
          checked={settings.autoRun}
          onChange={(checked) => update({ autoRun: checked })}
          ariaLabel="Auto-run programs on new drives and media"
        />
      </div>
      <div>
        <label htmlFor="camera-import" className="block mb-space-1">
          Camera import command
        </label>
        <input
          id="camera-import"
          type="text"
          value={settings.cameraImportCommand}
          onChange={(e) => update({ cameraImportCommand: e.target.value })}
          className="w-full border rounded p-space-1"
          aria-label="Camera import command"
        />
      </div>
      <div className="flex gap-space-1">
        <button
          onClick={insertDevice}
          className="px-space-2 py-space-1 rounded bg-ub-orange text-white"
        >
          Insert mock device
        </button>
        <button
          onClick={ejectDevice}
          className="px-space-2 py-space-1 rounded bg-ubt-cool-grey text-white"
        >
          Eject device
        </button>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
