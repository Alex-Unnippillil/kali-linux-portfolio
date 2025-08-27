import QRCode from 'qrcode';

export async function generateDataUrl(text, opts = {}) {
  return QRCode.toDataURL(text, opts);
}

export function wifiPreset({ ssid, password, security = 'WPA' }) {
  return `WIFI:T:${security};S:${ssid};P:${password};;`;
}

export function urlPreset(url) {
  return url;
}

export function vcardPreset({ name, org = '', title = '', phone = '', email = '' }) {
  return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${org}\nTITLE:${title}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
}

export function smsPreset({ number, message = '' }) {
  return `SMSTO:${number}:${message}`;
}

export function emailPreset({ address, subject = '', body = '' }) {
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const Presets = {
  wifi: wifiPreset,
  url: urlPreset,
  vcard: vcardPreset,
  sms: smsPreset,
  email: emailPreset,
};
