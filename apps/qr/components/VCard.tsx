import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Contact {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
}

const VCard: React.FC = () => {
  const [contact, setContact] = useState<Contact>({
    firstName: '',
    lastName: '',
    organization: '',
    title: '',
    phone: '',
    email: '',
  });
  const [payload, setPayload] = useState('');
  const [qr, setQr] = useState('');

  useEffect(() => {
    const { firstName, lastName, organization, title, phone, email } = contact;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${firstName} ${lastName}`.trim(),
      organization && `ORG:${organization}`,
      title && `TITLE:${title}`,
      phone && `TEL;TYPE=CELL:${phone}`,
      email && `EMAIL:${email}`,
      'END:VCARD',
    ].filter(Boolean);
    setPayload(lines.join('\n'));
  }, [contact]);

  useEffect(() => {
    if (!payload) {
      setQr('');
      return;
    }
    QRCode.toDataURL(payload, { margin: 1 })
      .then((data: string) => setQr(data))
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
    link.download = 'vcard.png';
    link.click();
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="space-y-2 text-sm">
        <label className="block">
          First Name
          <input
            type="text"
            value={contact.firstName}
            onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
            className="w-full mt-1 rounded p-1 text-black"
          />
        </label>
        <label className="block">
          Last Name
          <input
            type="text"
            value={contact.lastName}
            onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
            className="w-full mt-1 rounded p-1 text-black"
          />
        </label>
        <label className="block">
          Organization
          <input
            type="text"
            value={contact.organization}
            onChange={(e) => setContact({ ...contact, organization: e.target.value })}
            className="w-full mt-1 rounded p-1 text-black"
          />
        </label>
        <label className="block">
          Title
          <input
            type="text"
            value={contact.title}
            onChange={(e) => setContact({ ...contact, title: e.target.value })}
            className="w-full mt-1 rounded p-1 text-black"
          />
        </label>
        <label className="block">
          Phone
          <input
            type="tel"
            value={contact.phone}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            className="w-full mt-1 rounded p-1 text-black"
          />
        </label>
        <label className="block">
          Email
          <input
            type="email"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            className="w-full mt-1 rounded p-1 text-black"
          />
        </label>
      </div>

      {payload && (
        <div className="space-y-2">
          <p className="break-all text-sm whitespace-pre-line">{payload}</p>
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

export default VCard;

