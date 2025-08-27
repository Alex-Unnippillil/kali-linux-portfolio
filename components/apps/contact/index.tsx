import React, { useState } from 'react';

const CONTACT_EMAIL = 'alex.j.unnippillil@gmail.com';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setError('All fields are required');
      setSuccess(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email');
      setSuccess(false);
      return;
    }
    setError('');
    const full = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(full);
    }
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      `Message from ${name}`
    )}&body=${encodeURIComponent(full)}`;
    window.open(mailto);
    setSuccess(true);
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white flex flex-col gap-2">
      {revealed ? (
        <div data-testid="contact-email" className="text-sm">{CONTACT_EMAIL}</div>
      ) : (
        <button
          data-testid="reveal-email"
          className="underline text-sm self-start"
          onClick={() => setRevealed(true)}
        >
          Reveal Email
        </button>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 flex-1">
        <input
          aria-label="name"
          placeholder="Name"
          className="p-2 rounded text-black"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          aria-label="email"
          placeholder="Email"
          className="p-2 rounded text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <textarea
          aria-label="message"
          placeholder="Message"
          className="p-2 rounded text-black flex-1"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="submit"
          className="bg-ub-orange text-black rounded p-2 mt-2 self-start"
        >
          Send
        </button>
      </form>
      {error && (
        <div role="alert" className="text-red-500 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="text-green-500 text-sm">
          Message copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default Contact;

export const displayContact = () => <Contact />;

