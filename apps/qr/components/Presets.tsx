import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Preset = 'text' | 'url' | 'wifi';

interface WifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
}

const Presets: React.FC = () => {
  const [preset, setPreset] = useState<Preset>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [wifi, setWifi] = useState<WifiData>({ ssid: '', password: '', encryption: 'WPA' });
  const [payload, setPayload] = useState('');
  const [qr, setQr] = useState('');

  useEffect(() => {
    let value = '';
    if (preset === 'text') value = text;
    if (preset === 'url') value = url;
    if (preset === 'wifi') {
      const { ssid, password, encryption } = wifi;
      const enc = encryption === 'nopass' ? '' : encryption;
      value = `WIFI:T:${enc};S:${ssid};P:${password};;`;
    }
    setPayload(value);
  }, [preset, text, url, wifi]);

  useEffect(() => {
    if (!payload) {
      setQr('');
      return;
    }
    QRCode.toDataURL(payload, { margin: 1 })
      .then((data) => setQr(data))
      .catch(() => setQr(''));
  }, [payload]);

  const copyPayload = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard?.writeText(payload);
    } catch {
      /* ignore */
    }
  };

  const downloadPng = () => {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = qr;
    link.download = 'qr.png';
    link.click();
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="space-y-2">
        <label htmlFor="preset-type" className="block text-sm">
          Type
          <select
            id="preset-type"
            value={preset}
            onChange={(e) => setPreset(e.target.value as Preset)}
            className="ml-2 rounded p-1 text-black"
          >
            <option value="text">Text</option>
            <option value="url">URL</option>
            <option value="wifi">WiFi</option>
          </select>
        </label>

        {preset === 'text' && (
          <label htmlFor="preset-text" className="block text-sm">
            Text
            <input
              id="preset-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full mt-1 rounded p-1 text-black"
            />
          </label>
        )}

        {preset === 'url' && (
          <label htmlFor="preset-url" className="block text-sm">
            URL
            <input
              id="preset-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full mt-1 rounded p-1 text-black"
            />
          </label>
        )}

        {preset === 'wifi' && (
          <div className="space-y-2 text-sm">
            <label className="block">
              SSID
              <input
                type="text"
                value={wifi.ssid}
                onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                className="w-full mt-1 rounded p-1 text-black"
              />
            </label>
            <label className="block">
              Password
              <input
                type="text"
                value={wifi.password}
                onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                className="w-full mt-1 rounded p-1 text-black"
              />
            </label>
            <label className="block">
              Encryption
              <select
                value={wifi.encryption}
                onChange={(e) =>
                  setWifi({ ...wifi, encryption: e.target.value as WifiData['encryption'] })
                }
                className="w-full mt-1 rounded p-1 text-black"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {payload && (
        <div className="space-y-2">
          <p className="break-all text-sm">{payload}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyPayload}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={downloadPng}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Download
            </button>
          </div>
        </div>
      )}

      {qr && <img src={qr} alt="Generated QR code" className="h-48 w-48 bg-white" />}
    </div>
  );
};

export default Presets;

