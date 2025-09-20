import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Preset = 'text' | 'url' | 'wifi';

interface WifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
}

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPayloadChange?: (payload: string) => void;
  size: number;
  margin: number;
  ecc: 'L' | 'M' | 'Q' | 'H';
  logo?: string | null;
  foregroundColor: string;
  backgroundColor: string;
}

const Presets: React.FC<Props> = ({
  canvasRef,
  onPayloadChange,
  size,
  margin,
  ecc,
  logo,
  foregroundColor,
  backgroundColor,
}) => {
  const [preset, setPreset] = useState<Preset>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [wifi, setWifi] = useState<WifiData>({ ssid: '', password: '', encryption: 'WPA' });
  const [payload, setPayload] = useState('');

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
    onPayloadChange?.(value);
  }, [preset, text, url, wifi, onPayloadChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!payload) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    QRCode.toCanvas(canvas, payload, {
      margin,
      width: size,
      errorCorrectionLevel: ecc,
      color: {
        dark: foregroundColor,
        light: backgroundColor,
      },
    })
      .then(() => {
        if (logo) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const img = new Image();
            img.src = logo;
            img.onload = () => {
              const imgSize = size * 0.2;
              const x = (canvas.width - imgSize) / 2;
              const y = (canvas.height - imgSize) / 2;
              ctx.drawImage(img, x, y, imgSize, imgSize);
            };
          }
        }
      })
      .catch(() => {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
  }, [
    payload,
    canvasRef,
    size,
    margin,
    ecc,
    logo,
    foregroundColor,
    backgroundColor,
  ]);

  const copyPayload = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard?.writeText(payload);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Presets;

