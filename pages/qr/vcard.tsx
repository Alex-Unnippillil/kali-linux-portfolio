"use client";

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const VCardPage: React.FC = () => {
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vcard, setVcard] = useState('');
  const [png, setPng] = useState('');
  const [svg, setSvg] = useState('');

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
      setPng('');
      setSvg('');
      return;
    }
    QRCode.toDataURL(vcard, { margin: 1 })
      .then(setPng)
      .catch(() => setPng(''));
    QRCode.toString(vcard, { type: 'svg', margin: 1 })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [vcard]);

  const downloadPng = () => {
    if (!png) return;
    const link = document.createElement('a');
    link.href = png;
    link.download = 'vcard.png';
    link.click();
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vcard.svg';
    link.click();
    URL.revokeObjectURL(url);
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
            inputMode="text"
            autoComplete="name"
            autoCorrect="off"
          />
        </label>
        <label className="block text-sm">
          Organization
          <input
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            inputMode="text"
            autoComplete="organization"
            autoCorrect="off"
          />
        </label>
        <label className="block text-sm">
          Phone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            inputMode="tel"
            autoComplete="tel"
            autoCorrect="off"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            inputMode="email"
            autoComplete="email"
            autoCorrect="off"
          />
        </label>
      </form>
      {vcard && (
        <div className="flex flex-col items-center gap-2">
          <pre className="whitespace-pre-wrap break-all text-xs">{vcard}</pre>
          {png && (
            <Image
              src={png}
              alt="vCard QR"
              width={192}
              height={192}
              sizes="192px"
              className="h-48 w-48"
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadPng}
              className="rounded bg-blue-600 p-2 text-white"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="rounded bg-green-600 p-2 text-white"
            >
              Download SVG
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VCardPage;
