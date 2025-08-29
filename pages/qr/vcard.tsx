import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const VCardPage: React.FC = () => {
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vcard, setVcard] = useState('');
  const [qr, setQr] = useState('');

  useEffect(() => {
    if (!name && !org && !phone && !email) {
      setVcard('');
      return;
    }
    const parts = name.trim().split(' ');
    const first = parts.shift() || '';
    const last = parts.pop() || '';
    const middle = parts.join(' ');
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${last};${first};${middle};;`,
      `FN:${name}`,
    ];
    if (org) lines.push(`ORG:${org}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
    if (email) lines.push(`EMAIL:${email}`);
    lines.push('END:VCARD');
    setVcard(lines.join('\n'));
  }, [name, org, phone, email]);

  useEffect(() => {
    if (!vcard) {
      setQr('');
      return;
    }
    QRCode.toDataURL(vcard, { margin: 1 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [vcard]);

  const downloadPng = () => {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = qr;
    link.download = 'vcard.png';
    link.click();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <form className="w-full max-w-md space-y-2">
        <label className="block text-sm">
          Full Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block text-sm">
          Organization
          <input
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block text-sm">
          Phone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
      </form>
      {vcard && (
        <div className="flex flex-col items-center gap-2">
          <pre className="whitespace-pre-wrap break-all text-xs">{vcard}</pre>
          {qr && <img src={qr} alt="vCard QR" className="h-48 w-48" />}
          <button
            type="button"
            onClick={downloadPng}
            className="rounded bg-blue-600 p-2 text-white"
          >
            Download
          </button>
        </div>
      )}
    </div>
  );
};

export default VCardPage;
