import { useState } from 'react';
import Modal from '../../../components/base/Modal';
import type { PowerSettings, PowerProfile } from '@/src/lib/power/schema';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: PowerSettings;
  onChange: (settings: PowerSettings) => void;
}

const ProfileEditor = ({ profile, onChange }: { profile: PowerProfile; onChange: (p: PowerProfile) => void }) => (
  <div className="flex flex-col gap-2">
    <label>
      CPU
      <input
        type="number"
        min={0}
        max={100}
        value={profile.cpu}
        onChange={(e) => onChange({ ...profile, cpu: Number(e.target.value) })}
      />
    </label>
    <label>
      GPU
      <input
        type="number"
        min={0}
        max={100}
        value={profile.gpu}
        onChange={(e) => onChange({ ...profile, gpu: Number(e.target.value) })}
      />
    </label>
  </div>
);

const PowerProfilesDialog = ({ open, onClose, settings, onChange }: Props) => {
  const [tab, setTab] = useState<'ac' | 'battery'>('ac');

  const updateProfile = (key: 'ac' | 'battery', profile: PowerProfile) => {
    onChange({ ...settings, [key]: profile });
  };

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="p-4 bg-black text-white">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('ac')} aria-selected={tab === 'ac'}>AC</button>
          <button onClick={() => setTab('battery')} aria-selected={tab === 'battery'}>Battery</button>
        </div>
        {tab === 'ac' && <ProfileEditor profile={settings.ac} onChange={(p) => updateProfile('ac', p)} />}
        {tab === 'battery' && <ProfileEditor profile={settings.battery} onChange={(p) => updateProfile('battery', p)} />}
      </div>
    </Modal>
  );
};

export default PowerProfilesDialog;
