import React, { useState } from 'react';

const Nessus = () => {
  const [url, setUrl] = useState('https://localhost:8834');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');

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

  const logout = () => {
    setToken('');
    setScans([]);
  };

  if (!token) {
    return (
      <div className="h-full w-full bg-gray-900 text-white flex items-center justify-center">
        <form onSubmit={login} className="space-y-2 p-4 w-64">
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
        <button onClick={logout} className="bg-red-600 px-2 py-1 rounded">
          Logout
        </button>
      </div>
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

