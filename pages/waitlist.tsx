import { useState } from 'react';

export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus('Check your email to confirm your subscription.');
      } else {
        setStatus('Unable to join queue.');
      }
    } catch {
      setStatus('Unable to join queue.');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl mb-2">Join the queue</h1>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2"
          placeholder="you@example.com"
        />
        <label className="text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mr-2"
          />
          I consent to the storage of my email for the purpose of receiving updates. I
          understand I can request deletion at any time.
        </label>
        <button
          type="submit"
          className="bg-blue-600 text-white p-2"
          disabled={!consent}
        >
          Join
        </button>
      </form>
      {status && <p className="mt-2 text-sm">{status}</p>}
    </div>
  );
}
