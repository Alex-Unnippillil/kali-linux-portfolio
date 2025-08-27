import React, { useState } from 'react';

export const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const sanitize = (str: string) =>
  str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));

export const processContactForm = async (
  data: { name: string; email: string; message: string; honeypot: string },
  fetchImpl: typeof fetch = fetch
) => {
  const name = data.name.trim();
  const email = data.email.trim();
  const message = data.message.trim();

  if (data.honeypot) return { success: false };
  if (!name || name.length > 100) return { success: false, error: 'Invalid name' };
  if (!isValidEmail(email)) return { success: false, error: 'Invalid email' };
  if (!message || message.length > 1000)
    return { success: false, error: 'Invalid message' };

  try {
    const res = await fetchImpl('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sanitize(name),
        email,
        message: sanitize(message),
        honeypot: '',
      }),
    });
    if (!res.ok) return { success: false, error: 'Submission failed' };
    return { success: true };
  } catch {
    return { success: false, error: 'Submission failed' };
  }
};

const ContactApp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await processContactForm({ name, email, message, honeypot });
    if (!result.success) {
      setError(result.error ? sanitize(result.error) : 'Submission failed');
      setSuccess(false);
    } else {
      setError('');
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  return (
    <div className="p-4 text-black">
      <div style={{ maxInlineSize: '60ch' }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            className="p-1 border"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="p-1 border"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
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
        <div aria-live="polite">
          {error && <div className="text-red-500 mt-2">{error}</div>}
          {success && !error && (
            <div role="status" className="text-green-600 mt-2">
              Message sent!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactApp;

