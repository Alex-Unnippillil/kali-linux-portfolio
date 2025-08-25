import React, { useState } from 'react';

// Simple demonstration of WPA handshake capture and cracking
// This is a simulated version for the portfolio environment.
export default function Aircrack() {
  const [handshake, setHandshake] = useState(null);
  const [wordlist, setWordlist] = useState([]);
  const [status, setStatus] = useState('');
  const [psk, setPsk] = useState('');

  const captureHandshake = () => {
    // In a real scenario this would trigger tools like airodump-ng.
    // Here we simply simulate capturing a handshake with a known key.
    setHandshake({ ssid: 'DemoNetwork', psk: 'kali' });
    setPsk('');
    setStatus('Captured handshake for DemoNetwork');
  };

  const loadWordlist = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const words = text.split(/\r?\n/).filter(Boolean);
    setWordlist(words);
  };

  const crackHandshake = () => {
    if (!handshake) {
      setStatus('Capture a handshake first.');
      return;
    }
    if (wordlist.length === 0) {
      setStatus('Load a wordlist.');
      return;
    }
    setStatus('Cracking...');
    setTimeout(() => {
      const found = wordlist.find((w) => w.trim() === handshake.psk);
      if (found) {
        setPsk(found.trim());
        setStatus('Handshake successfully cracked!');
      } else {
        setStatus('Key not found in wordlist.');
      }
    }, 500);
  };

  return (
    <div className="w-full h-full bg-ub-cool-grey text-white p-2 text-sm overflow-y-auto">
      <h1 className="text-lg font-bold mb-4">Aircrack</h1>
      <div className="mb-4">
        <button
          type="button"
          onClick={captureHandshake}
          className="px-2 py-1 bg-ub-dark-blue rounded"
        >
          Capture Handshake
        </button>
        {handshake && (
          <div className="mt-2">
            Captured handshake for <b>{handshake.ssid}</b>
          </div>
        )}
      </div>
      <div className="mb-4">
        <input type="file" accept=".txt" onChange={loadWordlist} className="mb-2" />
        {wordlist.length > 0 && <div>{wordlist.length} words loaded</div>}
      </div>
      <div className="mb-4">
        <button
          type="button"
          onClick={crackHandshake}
          className="px-2 py-1 bg-ub-dark-blue rounded"
        >
          Crack Handshake
        </button>
      </div>
      {status && <div className="mb-2">{status}</div>}
      {psk && (
        <div className="font-mono">
          PSK: <span className="text-green-400">{psk}</span>
        </div>
      )}
      <p className="mt-4 opacity-75">
        This is a simplified demonstration of the aircrack-ng workflow. It
        simulates capturing a WPA handshake and attempts to crack it using a
        provided wordlist.
      </p>
    </div>
  );
}

