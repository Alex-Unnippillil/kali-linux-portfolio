import React, { useState, useEffect } from 'react';

// Basic AES-GCM helpers to encrypt/decrypt credential data
const SECRET = process.env.NEXT_PUBLIC_NESSUS_SECRET || 'nessus-secret';

async function getKey() {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('nessus-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(text) {
  const key = await getKey();
  if (!key) return { iv: [], data: [] };
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipher = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(cipher)) };
}

async function decryptText({ iv, data }) {
  const key = await getKey();
  if (!key) return '';
  const plain = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );
  return new TextDecoder().decode(plain);
}

const Nessus = () => {
  const [url, setUrl] = useState('https://localhost:8834');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState([]);
  const [showCreds, setShowCreds] = useState(false);
  const [selectedCred, setSelectedCred] = useState('');
  const [newCredName, setNewCredName] = useState('');
  const [newCredUrl, setNewCredUrl] = useState('');
  const [newCredUser, setNewCredUser] = useState('');
  const [newCredPass, setNewCredPass] = useState('');
  const [showNewScan, setShowNewScan] = useState(false);
  const [scanName, setScanName] = useState('');
  const [scanTargets, setScanTargets] = useState('');
  const [scanCredential, setScanCredential] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('nessusCredentials');
        if (stored) setCredentials(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('nessusCredentials', JSON.stringify(credentials));
    }
  }, [credentials]);

  const handleSelect = async (e) => {
    const id = e.target.value;
    setSelectedCred(id);
    const cred = credentials.find((c) => c.id === id);
    if (cred) {
      try {
        const decoded = JSON.parse(await decryptText(cred.data));
        setUrl(decoded.url);
        setUsername(decoded.username);
        setPassword(decoded.password);
      } catch {
        // ignore
      }
    }
  };

  const addCredential = async (e) => {
    e.preventDefault();
    const payload = JSON.stringify({
      url: newCredUrl,
      username: newCredUser,
      password: newCredPass,
    });
    const data = await encryptText(payload);
    const cred = {
      id: window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
      name: newCredName || newCredUser,
      data,
    };
    setCredentials([...credentials, cred]);
    setNewCredName('');
    setNewCredUrl('');
    setNewCredUser('');
    setNewCredPass('');
  };

  const deleteCredential = (id) => {
    setCredentials(credentials.filter((c) => c.id !== id));
    if (selectedCred === id) setSelectedCred('');
  };

  const login = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${url}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error('Authentication failed');
      const data = await res.json();
      setToken(data.token);
      fetchScans(data.token, url);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchScans = async (tkn = token, baseUrl = url) => {
    try {
      const res = await fetch(`${baseUrl}/scans`, {
        headers: {
          'X-Cookie': `token=${tkn}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!res.ok) throw new Error('Unable to fetch scans');
      const data = await res.json();
      setScans(data.scans || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const createScan = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let credentialSettings = {};
      if (scanCredential) {
        const cred = credentials.find((c) => c.id === scanCredential);
        if (cred) {
          const decoded = JSON.parse(await decryptText(cred.data));
          credentialSettings = {
            credentials: {
              host: {
                host: [{ username: decoded.username, password: decoded.password }],
              },
            },
          };
        }
      }
      const body = {
        uuid: 'scan-uuid',
        settings: { name: scanName, text_targets: scanTargets, ...credentialSettings },
      };
      const res = await fetch(`${url}/scans`, {
        method: 'POST',
        headers: {
          'X-Cookie': `token=${token}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create scan');
      setShowNewScan(false);
      setScanName('');
      setScanTargets('');
      setScanCredential('');
      fetchScans();
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    setToken('');
    setScans([]);
  };

  if (!token) {
    return (
      <div className="h-full w-full bg-gray-900 text-white flex items-center justify-center">
        <form onSubmit={login} className="space-y-2 p-4 w-64">
          {credentials.length > 0 && (
            <>
              <label htmlFor="nessus-saved" className="block text-sm">
                Saved Credentials
              </label>
              <select
                id="nessus-saved"
                className="w-full p-2 rounded text-black"
                value={selectedCred}
                onChange={handleSelect}
              >
                <option value="">--Select--</option>
                {credentials.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <label htmlFor="nessus-url" className="block text-sm">
            Nessus URL
          </label>
          <input
            id="nessus-url"
            className="w-full p-2 rounded text-black"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'nessus-error' : undefined}
            placeholder="https://nessus:8834"
          />
          <label htmlFor="nessus-username" className="block text-sm">
            Username
          </label>
          <input
            id="nessus-username"
            className="w-full p-2 rounded text-black"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'nessus-error' : undefined}
          />
          <label htmlFor="nessus-password" className="block text-sm">
            Password
          </label>
          <input
            id="nessus-password"
            type="password"
            className="w-full p-2 rounded text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'nessus-error' : undefined}
          />
          <button type="submit" className="w-full bg-blue-600 py-2 rounded">
            Login
          </button>
          <button
            type="button"
            onClick={() => setShowCreds((s) => !s)}
            className="w-full bg-gray-700 py-1 rounded"
          >
            {showCreds ? 'Hide' : 'Manage'} Credentials
          </button>
          {showCreds && (
            <div className="border border-gray-700 p-2">
              <ul className="space-y-1 mb-2">
                {credentials.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteCredential(c.id)}
                      className="text-red-400"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
              <form onSubmit={addCredential} className="space-y-1">
                <input
                  className="w-full p-1 rounded text-black"
                  placeholder="Label"
                  value={newCredName}
                  onChange={(e) => setNewCredName(e.target.value)}
                />
                <input
                  className="w-full p-1 rounded text-black"
                  placeholder="URL"
                  value={newCredUrl}
                  onChange={(e) => setNewCredUrl(e.target.value)}
                />
                <input
                  className="w-full p-1 rounded text-black"
                  placeholder="Username"
                  value={newCredUser}
                  onChange={(e) => setNewCredUser(e.target.value)}
                />
                <input
                  className="w-full p-1 rounded text-black"
                  placeholder="Password"
                  type="password"
                  value={newCredPass}
                  onChange={(e) => setNewCredPass(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full bg-green-600 py-1 rounded"
                >
                  Save
                </button>
              </form>
            </div>
          )}
          {error && (
            <p
              id="nessus-error"
              role="alert"
              className="text-red-500 text-sm"
            >
              {error}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Scans</h2>
        <div className="space-x-2">
          <button
            onClick={() => setShowNewScan((s) => !s)}
            className="bg-blue-600 px-2 py-1 rounded"
          >
            {showNewScan ? 'Close' : 'New Scan'}
          </button>
          <button onClick={logout} className="bg-red-600 px-2 py-1 rounded">
            Logout
          </button>
        </div>
      </div>
      {showNewScan && (
        <form onSubmit={createScan} className="mb-4 space-y-1">
          <input
            className="w-full p-2 rounded text-black"
            placeholder="Scan Name"
            value={scanName}
            onChange={(e) => setScanName(e.target.value)}
          />
          <input
            className="w-full p-2 rounded text-black"
            placeholder="Targets"
            value={scanTargets}
            onChange={(e) => setScanTargets(e.target.value)}
          />
          <select
            className="w-full p-2 rounded text-black"
            value={scanCredential}
            onChange={(e) => setScanCredential(e.target.value)}
          >
            <option value="">No Credentials</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="bg-green-600 px-2 py-1 rounded">
            Create Scan
          </button>
        </form>
      )}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <ul className="space-y-1">
        {scans.map((scan) => (
          <li key={scan.id} className="border-b border-gray-700 pb-1">
            {scan.name} - {scan.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Nessus;

export const displayNessus = () => {
  return <Nessus />;
};

