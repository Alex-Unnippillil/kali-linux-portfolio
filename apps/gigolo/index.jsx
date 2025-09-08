'use client';

import { isBrowser } from '@/utils/env';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gigolo-bookmarks';
const NETWORK_KEY = 'gigolo-network';
const ALLOWED_PROTOCOLS = ['smb://', 'sftp://', 'ftp://'];

const GigoloApp = () => {
  const [url, setUrl] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [networkEntries, setNetworkEntries] = useState([]);

  useEffect(() => {
    if (!isBrowser()) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setBookmarks(JSON.parse(stored));
    const net = window.localStorage.getItem(NETWORK_KEY);
    if (net) setNetworkEntries(JSON.parse(net));
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    if (!isBrowser()) return;
    window.localStorage.setItem(NETWORK_KEY, JSON.stringify(networkEntries));
  }, [networkEntries]);

  const addBookmark = () => {
    const trimmed = url.trim();
    if (!ALLOWED_PROTOCOLS.some((p) => trimmed.startsWith(p))) {
      alert('Only smb://, sftp://, and ftp:// URLs are allowed.');
      return;
    }
    if (!bookmarks.includes(trimmed)) {
      setBookmarks([...bookmarks, trimmed]);
    }
    setUrl('');
  };

  const removeBookmark = (u) => {
    setBookmarks(bookmarks.filter((b) => b !== u));
  };

  const connect = (u) => {
    if (!networkEntries.includes(u)) {
      setNetworkEntries([...networkEntries, u]);
    }
  };

  const disconnect = (u) => {
    setNetworkEntries(networkEntries.filter((n) => n !== u));
  };

  return (
    <div className="p-4 space-y-4 text-white bg-gray-900 h-full overflow-auto">
      <h1 className="text-2xl">Gigolo Bookmark Manager</h1>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="smb://server/share"
          className="flex-1 rounded border border-gray-700 bg-gray-800 p-2"
        />
        <button
          onClick={addBookmark}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Add Bookmark
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h2 className="mb-2 text-xl">Bookmarks</h2>
          {bookmarks.length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">No bookmarks yet.</p>
          )}
          <ul className="space-y-2">
            {bookmarks.map((b) => (
              <li
                key={b}
                className="flex items-center justify-between rounded border border-gray-700 p-2 bg-gray-800"
              >
                <span className="break-all mr-2">{b}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => connect(b)}
                    className="rounded bg-green-600 px-2 py-1 text-white"
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => removeBookmark(b)}
                    className="rounded bg-red-600 px-2 py-1 text-white"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1">
          <h2 className="mb-2 text-xl">Thunar Network</h2>
          {networkEntries.length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">No active connections.</p>
          )}
          <ul className="space-y-2">
            {networkEntries.map((n) => (
              <li
                key={n}
                className="flex items-center justify-between rounded border border-gray-700 p-2 bg-gray-800"
              >
                <span className="break-all mr-2">{n}</span>
                <button
                  onClick={() => disconnect(n)}
                  className="rounded bg-yellow-600 px-2 py-1 text-white"
                >
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GigoloApp;
