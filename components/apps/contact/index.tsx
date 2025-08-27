import React, { useState } from 'react';

const DEV_EMAIL = 'alex.j.unnippillil@gmail.com';
export const RATE_LIMIT_MS = 60_000;

export const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

export const generateVCard = (name: string, email: string) =>
  `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nEMAIL:${email}\nEND:VCARD`;

export const processContactForm = async (
  data: { name: string; email: string; message: string; honeypot: string },
  env = {
    clipboard: navigator.clipboard,
    open: (url: string) => window.open(url),
    createObjectURL: (blob: Blob) => URL.createObjectURL(blob),
    document: document,
    sessionStorage: window.sessionStorage,
    now: () => Date.now(),
  }
) => {
  if (data.honeypot) return { success: false };
  if (!isValidEmail(data.email)) return { success: false, error: 'Invalid email' };

  const last = parseInt(env.sessionStorage.getItem('contact-last') || '0', 10);
  if (env.now() - last < RATE_LIMIT_MS)
    return { success: false, error: 'Rate limited' };

  const fullMessage = `Name: ${data.name}\nEmail: ${data.email}\nMessage: ${data.message}`;
  await env.clipboard.writeText(fullMessage);

  const mailto = `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(
    'Contact from ' + data.name
  )}&body=${encodeURIComponent(fullMessage)}`;
  env.open(mailto);

  const vcard = generateVCard(data.name, data.email);
  const blob = new Blob([vcard], { type: 'text/vcard' });
  const url = env.createObjectURL(blob);
  const a = env.document.createElement('a');
  a.href = url;
  a.download = 'contact.vcf';
  env.document.body.appendChild(a);
  a.click();
  env.document.body.removeChild(a);

  env.sessionStorage.setItem('contact-last', String(env.now()));
  return { success: true };
};

const ContactApp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await processContactForm({ name, email, message, honeypot });
    if (!result.success) setError(result.error || 'Submission failed');
    else setError('');
  };

  return (
    <div className="p-4 text-black">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          className="p-1 border"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="p-1 border"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <textarea
          className="p-1 border"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
        <button type="submit" className="bg-blue-500 text-white px-2 py-1">
          Send
        </button>
      </form>
      {error && (
        <div role="alert" className="text-red-500 mt-2">
          {error}
        </div>
      )}
      <div className="mt-4">
        {reveal ? (
          <a href={`mailto:${DEV_EMAIL}`}>{DEV_EMAIL}</a>
        ) : (
          <button onClick={() => setReveal(true)} className="underline">
            Reveal Email
          </button>
        )}
      </div>
    </div>
  );
};

export default ContactApp;

