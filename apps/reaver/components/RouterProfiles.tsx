import React, { useEffect, useState } from 'react';

export interface RouterProfile {
  id: string;
  label: string;
  /**
   * Number of failed attempts before the router locks WPS.
   * Use Infinity for routers that never lock.
   */
  lockAttempts: number;
  /**
   * Lock duration in seconds once the threshold is hit.
   */
  lockDuration: number;
}

export const ROUTER_PROFILES: RouterProfile[] = [
  {
    id: 'generic',
    label: 'Generic (no lockout)',
    lockAttempts: Infinity,
    lockDuration: 0,
  },
  {
    id: 'netgear',
    label: 'Netgear — lock after 5 attempts for 60s',
    lockAttempts: 5,
    lockDuration: 60,
  },
  {
    id: 'tplink',
    label: 'TP-Link — lock after 3 attempts for 300s',
    lockAttempts: 3,
    lockDuration: 300,
  },
];

interface RouterProfilesProps {
  onChange: (profile: RouterProfile) => void;
}

const STORAGE_KEY = 'reaver-router-profile';

const RouterProfiles: React.FC<RouterProfilesProps> = ({ onChange }) => {
  // ROUTER_PROFILES always contains at least one entry, default to the first
  const [selected, setSelected] = useState<RouterProfile>(ROUTER_PROFILES[0]!);

  // Load persisted profile on mount
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const profile = ROUTER_PROFILES.find((p) => p.id === stored) || ROUTER_PROFILES[0];
    setSelected(profile);
    onChange(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profile = ROUTER_PROFILES.find((p) => p.id === e.target.value)!;
    setSelected(profile);
    window.localStorage.setItem(STORAGE_KEY, profile.id);
    onChange(profile);
  };

  return (
    <div className="mb-4">
      <label htmlFor="router-profile" className="block text-sm mb-1">
        Router Vendor Profile
      </label>
      <select
        id="router-profile"
        className="p-2 rounded bg-gray-800 text-white"
        value={selected.id}
        onChange={handleChange}
      >
        {ROUTER_PROFILES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {selected.lockAttempts !== Infinity && (
        <p className="text-xs text-gray-400 mt-1">
          Locks after {selected.lockAttempts} failed attempts for {selected.lockDuration}s
        </p>
      )}
      {selected.lockAttempts === Infinity && (
        <p className="text-xs text-gray-400 mt-1">No WPS lockout behaviour</p>
      )}
    </div>
  );
};

export default RouterProfiles;

