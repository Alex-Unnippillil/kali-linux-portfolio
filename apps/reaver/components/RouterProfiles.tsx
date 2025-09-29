import React, { useEffect, useState } from 'react';
import {
  ROUTER_PROFILES,
  type RouterProfile,
  type VendorProfile,
} from '../utils/pinAlgorithms';

interface RouterProfilesProps {
  onChange: (profile: VendorProfile) => void;
}

const STORAGE_KEY = 'reaver-router-profile';

const RouterProfiles: React.FC<RouterProfilesProps> = ({ onChange }) => {
  const [selected, setSelected] = useState<VendorProfile>(ROUTER_PROFILES[0]);

  // Load persisted profile on mount
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const profile =
      (ROUTER_PROFILES.find((p) => p.id === stored) as VendorProfile | undefined) ||
      ROUTER_PROFILES[0];
    setSelected(profile);
    onChange(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profile = ROUTER_PROFILES.find(
      (p) => p.id === e.target.value,
    ) as VendorProfile | undefined;
    if (!profile) return;
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
      <p className="text-xs text-gray-400 mt-2">{selected.description}</p>
    </div>
  );
};

export default RouterProfiles;

export { ROUTER_PROFILES } from '../utils/pinAlgorithms';
export type { RouterProfile, VendorProfile } from '../utils/pinAlgorithms';

