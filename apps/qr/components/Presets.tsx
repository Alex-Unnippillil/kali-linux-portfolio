import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  escapeWifiValue,
  sanitizeInput,
  validateQrText,
} from '../../../utils/qrValidation';

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
  onValidationChange?: (error: string | null) => void;
}

const Presets: React.FC<Props> = ({
  canvasRef,
  onPayloadChange,
  size,
  margin,
  ecc,
  logo,
  onValidationChange,
}) => {
  const [preset, setPreset] = useState<Preset>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [wifi, setWifi] = useState<WifiData>({ ssid: '', password: '', encryption: 'WPA' });
  const [payload, setPayload] = useState('');
  const [presetError, setPresetError] = useState<string | null>(null);

  useEffect(() => {
    onValidationChange?.(presetError);
  }, [presetError, onValidationChange]);

  const validateUrl = (value: string) => {
    const cleaned = sanitizeInput(value).trim();
    if (!cleaned) {
      return { payload: '', error: 'Enter a URL to encode.' };
    }
    if (!/^[a-zA-Z][\w+.-]*:/.test(cleaned)) {
      return {
        payload: '',
        error: 'Include the protocol, for example https://example.com.',
      };
    }
    try {
      const normalized = new URL(cleaned).toString();
      const { ok, sanitized, error } = validateQrText(normalized);
      return ok
        ? { payload: sanitized, error: null }
        : { payload: '', error: error ?? 'Invalid URL.' };
    } catch {
      return { payload: '', error: 'Enter a valid URL.' };
    }
  };

  const validateWifi = ({
    ssid,
    password,
    encryption,
  }: WifiData): { payload: string; error: string | null } => {
    const ssidValue = sanitizeInput(ssid).trim();
    if (!ssidValue) {
      return { payload: '', error: 'SSID is required.' };
    }
    const passwordValue = sanitizeInput(password);
    if (encryption !== 'nopass' && passwordValue.length < 8) {
      return { payload: '', error: 'Password must be at least 8 characters.' };
    }
    const encoded = `WIFI:T:${
      encryption === 'nopass' ? '' : encryption
    };S:${escapeWifiValue(ssidValue)};P:${
      encryption === 'nopass' ? '' : escapeWifiValue(passwordValue)
    };;`;
    const { ok, sanitized, error } = validateQrText(encoded);
    return ok
      ? { payload: sanitized, error: null }
      : { payload: '', error: error ?? 'Invalid Wi-Fi configuration.' };
  };

  useEffect(() => {
    let value = '';
    let error: string | null = null;
    if (preset === 'text') {
      if (!text) {
        error = 'Enter text to encode.';
      } else {
        const { ok, sanitized, error: validationError } = validateQrText(text);
        if (ok) value = sanitized;
        else error = validationError ?? 'Invalid text.';
      }
    }
    if (preset === 'url') {
      const { payload: urlPayload, error: urlError } = validateUrl(url);
      value = urlPayload;
      error = urlError;
    }
    if (preset === 'wifi') {
      const { payload: wifiPayload, error: wifiError } = validateWifi(wifi);
      value = wifiPayload;
      error = wifiError;
    }
    setPayload(value);
    onPayloadChange?.(value);
    setPresetError(error);
  }, [preset, text, url, wifi, onPayloadChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!payload || presetError) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    QRCode.toCanvas(canvas, payload, {
      margin,
      width: size,
      errorCorrectionLevel: ecc,
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
        setPresetError((prev) => prev ?? 'Failed to render QR code.');
      });
  }, [payload, canvasRef, size, margin, ecc, logo, presetError]);

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
              onChange={(e) => setText(sanitizeInput(e.target.value))}
              className="w-full mt-1 rounded p-1 text-black"
              aria-label="Text payload"
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
              onChange={(e) => setUrl(sanitizeInput(e.target.value))}
              className="w-full mt-1 rounded p-1 text-black"
              aria-label="URL payload"
            />
          </label>
        )}

        {preset === 'wifi' && (
          <div className="space-y-2 text-sm">
            <label className="block" htmlFor="wifi-ssid">
              SSID
              <input
                id="wifi-ssid"
                type="text"
                value={wifi.ssid}
                onChange={(e) =>
                  setWifi({ ...wifi, ssid: sanitizeInput(e.target.value) })
                }
                className="w-full mt-1 rounded p-1 text-black"
                aria-label="Wi-Fi SSID"
              />
            </label>
            <label className="block" htmlFor="wifi-password">
              Password
              <input
                id="wifi-password"
                type="text"
                value={wifi.password}
                onChange={(e) =>
                  setWifi({ ...wifi, password: sanitizeInput(e.target.value) })
                }
                className="w-full mt-1 rounded p-1 text-black"
                aria-label="Wi-Fi password"
              />
            </label>
            <label className="block" htmlFor="wifi-encryption">
              Encryption
              <select
                id="wifi-encryption"
                value={wifi.encryption}
                onChange={(e) =>
                  setWifi({
                    ...wifi,
                    encryption: e.target.value as WifiData['encryption'],
                  })
                }
                className="w-full mt-1 rounded p-1 text-black"
                aria-label="Wi-Fi encryption"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {presetError && (
        <p className="text-xs text-red-300" role="alert">
          {presetError}
        </p>
      )}

      {payload && !presetError && (
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

