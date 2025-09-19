import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import { useProfiles } from '../../hooks/useProfiles';

const Navbar = () => {
  const [showStatus, setShowStatus] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const { profiles, activeProfileId, createProfile, deleteProfile, setActiveProfile, isSwitching } = useProfiles();

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId),
    [activeProfileId, profiles],
  );

  const handleSelectProfile = async (id) => {
    setShowProfiles(false);
    await setActiveProfile(id);
  };

  const handleCreateProfile = async () => {
    await createProfile();
    setShowProfiles(false);
  };

  const handleDeleteProfile = async (id) => {
    await deleteProfile(id);
  };

  return (
    <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
      <div className="pl-3 pr-1">
        <Image
          src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
          alt="network icon"
          width={16}
          height={16}
          className="w-4 h-4"
        />
      </div>
      <WhiskerMenu />
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button
            type="button"
            className="px-3 py-1 rounded hover:bg-ub-cool-grey transition-colors"
            aria-haspopup="menu"
            aria-expanded={showProfiles}
            onClick={() => setShowProfiles((prev) => !prev)}
          >
            {activeProfile ? activeProfile.name : 'Profiles'}
          </button>
          {showProfiles && (
            <div className="absolute right-0 mt-2 w-56 bg-ub-cool-grey border border-black border-opacity-20 rounded shadow-lg z-50">
              <div className="px-4 py-2 border-b border-black border-opacity-10 text-xs uppercase tracking-wide text-ubt-light">
                Profiles
              </div>
              <ul className="max-h-64 overflow-y-auto">
                {profiles.map((profile) => {
                  const isActive = profile.id === activeProfileId;
                  return (
                    <li key={profile.id} className="flex items-center justify-between px-4 py-2 text-left">
                      <button
                        type="button"
                        className={`flex-1 text-left truncate ${isActive ? 'font-semibold text-white' : 'text-ubt-grey'} hover:text-white`}
                        onClick={() => handleSelectProfile(profile.id)}
                        disabled={isActive || isSwitching}
                      >
                        {profile.name}
                        {isActive && <span className="ml-2 text-xs text-ubt-light">(active)</span>}
                      </button>
                      {profiles.length > 1 && !isActive && (
                        <button
                          type="button"
                          className="ml-2 text-xs text-red-300 hover:text-red-200"
                          onClick={() => handleDeleteProfile(profile.id)}
                          disabled={isSwitching}
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-black border-opacity-10 px-4 py-2 flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-ubt-grey hover:text-white"
                  onClick={handleCreateProfile}
                  disabled={isSwitching}
                >
                  Add profile
                </button>
                {isSwitching && <span className="text-xs text-ubt-light">Switching…</span>}
              </div>
            </div>
          )}
        </div>
        <div className="pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1">
          <Clock />
        </div>
      </div>
      <button
        type="button"
        id="status-bar"
        aria-label="System status"
        onClick={() => setShowStatus((prev) => !prev)}
        className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1"
      >
        <Status />
        <QuickSettings open={showStatus} />
      </button>
    </div>
  );
};

export default Navbar;
