import React, { useEffect, useState } from 'react';

const baseProtocols = ['ssh', 'ftp', 'http-get', 'http-post-form', 'smtp'];
const pluginProtocols = [];

export const registerHydraProtocol = (protocol) => {
  if (!pluginProtocols.includes(protocol)) {
    pluginProtocols.push(protocol);
    window.dispatchEvent(new Event('hydra-protocols-changed'));
  }
};

const loadWordlists = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const saveWordlists = (key, lists) => {
  localStorage.setItem(key, JSON.stringify(lists));
};

const HydraApp = () => {
  const [target, setTarget] = useState('');
  const [protocol, setProtocol] = useState('ssh');
  const [availableProtocols, setAvailableProtocols] = useState([
    ...baseProtocols,
    ...pluginProtocols,
  ]);

  const [userLists, setUserLists] = useState([]);
  const [passLists, setPassLists] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPass, setSelectedPass] = useState('');
  const [output, setOutput] = useState('');
  const [command, setCommand] = useState('');

  useEffect(() => {
    setUserLists(loadWordlists('hydraUserLists'));
    setPassLists(loadWordlists('hydraPassLists'));
  }, []);

  useEffect(() => {
    saveWordlists('hydraUserLists', userLists);
  }, [userLists]);

  useEffect(() => {
    saveWordlists('hydraPassLists', passLists);
  }, [passLists]);

  useEffect(() => {
    if (userLists.length && !selectedUser) {
      setSelectedUser(userLists[0].name);
    }
  }, [userLists, selectedUser]);

  useEffect(() => {
    if (passLists.length && !selectedPass) {
      setSelectedPass(passLists[0].name);
    }
  }, [passLists, selectedPass]);

  useEffect(() => {
    const update = () =>
      setAvailableProtocols([...baseProtocols, ...pluginProtocols]);
    window.addEventListener('hydra-protocols-changed', update);
    return () =>
      window.removeEventListener('hydra-protocols-changed', update);
  }, []);

  const addWordList = (file, listsSetter, lists) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const newLists = [...lists, { name: file.name, content: e.target.result }];
      listsSetter(newLists);
    };
    reader.readAsText(file);
  };

  const removeWordList = (name, listsSetter, lists) => {
    listsSetter(lists.filter((l) => l.name !== name));
  };

  const dryRunHydra = () => {
    const user = userLists.find((l) => l.name === selectedUser);
    const pass = passLists.find((l) => l.name === selectedPass);
    if (!target || !user || !pass) {
      setCommand('');
      setOutput('Please provide target, user list and password list');
      return;
    }

    const cmd = `hydra -L ${user.name} -P ${pass.name} ${protocol}://${target}`;
    setCommand(cmd);
    setOutput(
      'Dry run only. No attack executed.\n\n' +
        '⚠️ Account lockout risk: repeated attempts may trigger lockouts.\n' +
        'Ensure testing complies with credential policies and authorization.'
    );
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="space-y-2">
        <div>
          <label className="block mb-1">Target</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="192.168.0.1"
          />
        </div>
        <div>
          <label className="block mb-1">Protocol</label>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            className="w-full p-2 rounded text-black"
          >
            {availableProtocols.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">User List</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full p-2 rounded text-black mb-1"
          >
            {userLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            data-testid="user-file-input"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setUserLists, userLists)
            }
            className="w-full p-2 rounded text-black mb-1"
          />
          <ul>
            {userLists.map((l) => (
              <li key={l.name} className="flex justify-between">
                {l.name}
                <button
                  onClick={() => removeWordList(l.name, setUserLists, userLists)}
                  className="text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="block mb-1">Password List</label>
          <select
            value={selectedPass}
            onChange={(e) => setSelectedPass(e.target.value)}
            className="w-full p-2 rounded text-black mb-1"
          >
            {passLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            data-testid="pass-file-input"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setPassLists, passLists)
            }
            className="w-full p-2 rounded text-black mb-1"
          />
          <ul>
            {passLists.map((l) => (
              <li key={l.name} className="flex justify-between">
                {l.name}
                <button
                  onClick={() => removeWordList(l.name, setPassLists, passLists)}
                  className="text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={dryRunHydra}
          className="px-4 py-2 bg-green-600 rounded"
        >
          Dry Run
        </button>
      </div>
      {command && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span>Command Synopsis</span>
            <button
              onClick={copyCommand}
              className="px-2 py-1 text-sm bg-gray-700 rounded"
            >
              Copy
            </button>
          </div>
          <pre className="bg-black p-2 overflow-auto whitespace-pre-wrap">{command}</pre>
        </div>
      )}
      {output && (
        <pre className="mt-4 bg-black p-2 overflow-auto whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
};

export default HydraApp;

export const displayHydra = () => {
  return <HydraApp />;
};

