'use client';

import React, { useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import CompatHints, {
  ProfileKey,
  SelectionState,
  algorithmFields,
  algorithmLibrary,
  osProfiles,
} from './components/CompatHints';

const profileKeys = Object.keys(osProfiles) as ProfileKey[];

const getRecommendedSelection = (profileKey: ProfileKey): SelectionState => {
  const recommended = osProfiles[profileKey].recommended ?? {};
  return {
    kex: recommended.kex?.[0],
    hostKey: recommended.hostKey?.[0],
    cipher: recommended.cipher?.[0],
    mac: recommended.mac?.[0],
  };
};

const SSHBuilder: React.FC = () => {
  const [profileKey, setProfileKey] = useState<ProfileKey>(profileKeys[0]);
  const [selection, setSelection] = useState<SelectionState>(() => getRecommendedSelection(profileKeys[0]));
  const [user, setUser] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');

  const updateAlgorithm = (category: typeof algorithmFields[number]['id']) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      setSelection((prev) => ({
        ...prev,
        [category]: value === '' ? undefined : value,
      }));
    };

  const applyRecommended = () => {
    setSelection(getRecommendedSelection(profileKey));
  };

  const command = useMemo(() => {
    const parts = ['ssh'];

    if (selection.kex) {
      parts.push(`-o KexAlgorithms=${selection.kex}`);
    }
    if (selection.hostKey) {
      parts.push(`-o HostKeyAlgorithms=${selection.hostKey}`);
    }
    if (selection.cipher) {
      parts.push(`-c ${selection.cipher}`);
    }
    if (selection.mac) {
      parts.push(`-o MACs=${selection.mac}`);
    }
    if (port) {
      parts.push(`-p ${port}`);
    }

    const destination = host ? `${user ? `${user}@` : ''}${host}` : '';
    if (destination) {
      parts.push(destination);
    }

    return parts.join(' ').trim();
  }, [host, port, selection.cipher, selection.hostKey, selection.kex, selection.mac, user]);

  return (
    <div className="h-full overflow-auto bg-gray-900 p-4 text-white">
      <h1 className="mb-4 text-2xl">SSH Command Builder</h1>
      <p className="mb-6 text-sm text-yellow-300">
        Craft SSH connection commands safely. This builder never executes anything—it helps explore options and
        compatibility before you connect.
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="mb-6 grid gap-6 lg:grid-cols-2">
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-sky-200">Connection details</legend>
          <div>
            <label htmlFor="ssh-user" className="mb-1 block text-sm font-medium">
              Username
            </label>
            <input
              id="ssh-user"
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="kali"
            />
          </div>
          <div>
            <label htmlFor="ssh-host" className="mb-1 block text-sm font-medium">
              Host
            </label>
            <input
              id="ssh-host"
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="10.10.10.42"
            />
          </div>
          <div>
            <label htmlFor="ssh-port" className="mb-1 block text-sm font-medium">
              Port (optional)
            </label>
            <input
              id="ssh-port"
              type="number"
              min="1"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="22"
            />
          </div>
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-sky-200">Compatibility profile</legend>
          <div>
            <label htmlFor="ssh-profile" className="mb-1 block text-sm font-medium">
              Target server OS
            </label>
            <select
              id="ssh-profile"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={profileKey}
              onChange={(event) => setProfileKey(event.target.value as ProfileKey)}
            >
              {profileKeys.map((key) => (
                <option key={key} value={key}>
                  {osProfiles[key].name} · {osProfiles[key].release}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyRecommended}
              className="mt-2 rounded border border-sky-500 px-2 py-1 text-xs font-semibold text-sky-200 transition hover:bg-sky-600/20"
            >
              Load recommended algorithms
            </button>
          </div>
          {algorithmFields.map((field) => (
            <div key={field.id}>
              <label htmlFor={`ssh-${field.id}`} className="mb-1 block text-sm font-medium">
                {field.label}
              </label>
              <select
                id={`ssh-${field.id}`}
                value={selection[field.id] ?? ''}
                onChange={updateAlgorithm(field.id)}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              >
                <option value="">Auto negotiate</option>
                {algorithmLibrary[field.id].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </fieldset>
      </form>
      <div>
        <h2 className="mb-2 text-lg">Command Preview</h2>
        <pre className="overflow-auto rounded bg-black p-3 font-mono text-green-400">
          {command || '# Fill in the form to generate a command'}
        </pre>
      </div>
      <CompatHints profileKey={profileKey} selection={selection} />
    </div>
  );
};

const SSHPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Session ${countRef.current++}`, content: <SSHBuilder /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default SSHPreview;
