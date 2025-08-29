import React, { useEffect, useState } from 'react';
import emailjs from '@emailjs/browser';
import { useRouter } from 'next/router';

const subjectTemplates = [
  'General Inquiry',
  'Bug Report',
  'Feedback',
];

const getRecaptchaToken = (siteKey: string): Promise<string> =>
  new Promise((resolve) => {
    const g: any = (window as any).grecaptcha;
    if (!g || !siteKey) return resolve('');
    g.ready(() => {
      g
        .execute(siteKey, { action: 'submit' })
        .then((token: string) => resolve(token))
        .catch(() => resolve(''));
    });
  });

const InputHub = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(subjectTemplates[0]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [useCaptcha, setUseCaptcha] = useState(false);
  const [emailjsReady, setEmailjsReady] = useState(false);
  const [sentMessages, setSentMessages] = useState<
    { name: string; email: string; subject: string; message: string; status: string; time: number }[]
  >([]);

  useEffect(() => {
    const { preset, title, text, url, files } = router.query;
    if (preset === 'contact') {
      setSubject('General Inquiry');
    }
    const parts: string[] = [];
    if (title) parts.push(String(title));
    if (text) parts.push(String(text));
    if (url) parts.push(String(url));
    if (files) {
      try {
        const list = JSON.parse(
          decodeURIComponent(String(files))
        ) as { name: string; type: string }[];
        parts.push(
          ...list.map((f) => `File: ${f.name} (${f.type})`)
        );
      } catch {
        // ignore parse errors
      }
    }
    if (parts.length) {
      const incoming = parts.join('\n');
      setMessage((m) => (m ? `${m}\n${incoming}` : incoming));
    }
  }, [router.query]);

  useEffect(() => {
    const userId = process.env.NEXT_PUBLIC_USER_ID;
    const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_TEMPLATE_ID;
    if (userId && serviceId && templateId) {
      try {
        emailjs.init(userId);
        setEmailjsReady(true);
      } catch {
        setEmailjsReady(false);
      }
    }
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('sentMessages');
      if (stored) {
        setSentMessages(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('sentMessages', JSON.stringify(sentMessages));
    } catch {
      // ignore write errors
    }
  }, [sentMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const appendMessage = (result: string) =>
      setSentMessages((msgs) => [
        ...msgs,
        { name, email, subject, message, status: result, time: Date.now() },
      ]);
    if (!emailjsReady) {
      const final = 'Email service unavailable';
      setStatus(final);
      appendMessage(final);
      return;
    }
    const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID as string;
    const templateId = process.env.NEXT_PUBLIC_TEMPLATE_ID as string;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    const token = useCaptcha ? await getRecaptchaToken(siteKey) : '';
    setStatus('Sending...');
    try {
      await emailjs.send(serviceId, templateId, {
        name,
        email,
        subject,
        message,
        'g-recaptcha-response': token,
      });
      const final = 'Message sent!';
      setStatus(final);
      appendMessage(final);
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      const final = 'Failed to send message';
      setStatus(final);
      appendMessage(final);
    }
  };

  const exportCsv = () => {
    const header = ['Name', 'Email', 'Subject', 'Message', 'Status', 'Time'];
    const rows = sentMessages.map((m) => [
      m.name,
      m.email,
      m.subject,
      m.message,
      m.status,
      new Date(m.time).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sent-messages.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 text-black max-w-md mx-auto">
      <div className="mb-4">
        <span
          className={`px-2 py-1 text-sm rounded ${
            emailjsReady ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {emailjsReady ? 'EmailJS: Online' : 'EmailJS: Offline'}
        </span>
      </div>
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
        <select
          className="p-1 border"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          {subjectTemplates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <textarea
          className="p-1 border"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useCaptcha}
            onChange={(e) => setUseCaptcha(e.target.checked)}
            disabled={!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          />
          <span>Use reCAPTCHA</span>
        </label>
        <button type="submit" className="bg-blue-500 text-white px-2 py-1">
          Send
        </button>
      </form>
      {status && (
        <div role="status" className="mt-2 text-sm">
          {status}
        </div>
      )}
      {sentMessages.length > 0 && (
        <button
          type="button"
          onClick={exportCsv}
          className="mt-4 bg-gray-600 px-2 py-1 text-white"
        >
          Export CSV
        </button>
      )}
    </div>
  );
};

export default InputHub;
