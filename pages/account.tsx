import React, { FormEvent, useState } from 'react';

type ApiResult = { ok: boolean; message?: string; [key: string]: any };

const defaultMessage = 'Something went wrong. Please try again.';

export default function AccountPage() {
  const [status, setStatus] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [profile, setProfile] = useState<any>(null);

  const callApi = async (path: string, payload: any, method = 'POST') => {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(payload),
    });
    return (await res.json()) as ApiResult;
  };

  const onSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());
    const result = await callApi('/api/auth/signup', payload);
    if (result.ok) {
      setStatus(result.message || 'Account created.');
      if (result.verificationPreview) {
        setVerificationToken(result.verificationPreview);
      }
      return;
    }
    setStatus(result.message || defaultMessage);
  };

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());
    const result = await callApi('/api/auth/login', payload);
    setStatus(result.ok ? 'Logged in successfully.' : result.message || defaultMessage);
  };

  const onVerifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await callApi('/api/auth/verify-email', { token: verificationToken });
    setStatus(result.ok ? 'Email verified.' : result.message || defaultMessage);
  };

  const onRequestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());
    const result = await callApi('/api/auth/request-password-reset', payload);
    if (result.resetPreview) {
      setResetToken(result.resetPreview);
    }
    setStatus(result.message || (result.ok ? 'Password reset request submitted.' : defaultMessage));
  };

  const onResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());
    const result = await callApi('/api/auth/reset-password', payload);
    setStatus(result.ok ? 'Password updated.' : result.message || defaultMessage);
  };

  const onLoadProfile = async () => {
    const result = await callApi('/api/auth/profile', {}, 'GET');
    if (result.ok) {
      setProfile(result.profile);
      setStatus('Loaded profile.');
      return;
    }
    setStatus(result.message || defaultMessage);
  };

  const onUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      display_name: String(data.get('display_name') || ''),
      bio: String(data.get('bio') || ''),
    };
    const result = await callApi('/api/auth/profile', payload, 'PATCH');
    if (result.ok) {
      setProfile(result.profile);
      setStatus('Profile updated.');
      return;
    }
    setStatus(result.message || defaultMessage);
  };

  return (
    <div className="min-h-screen bg-[#ececec] px-6 py-12 text-[#0f172a]">
      <div className="mx-auto max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow">
        <h1 className="text-3xl font-semibold">Account Center</h1>
        <p className="text-sm text-slate-600">Sign up, verify your email, recover passwords, and manage your profile.</p>

        <section>
          <h2 className="mb-2 text-xl font-medium">Sign up</h2>
          <form className="space-y-2" onSubmit={onSignup}>
            <input name="username" aria-label="Username" placeholder="username" className="w-full rounded border p-2" required minLength={3} />
            <input name="displayName" aria-label="Display name" placeholder="display name" className="w-full rounded border p-2" required minLength={2} />
            <input name="email" aria-label="Email address" type="email" placeholder="email@example.com" className="w-full rounded border p-2" required />
            <input name="password" aria-label="Password" type="password" placeholder="Strong password" className="w-full rounded border p-2" required minLength={12} />
            <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Create account</button>
          </form>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-medium">Verify email</h2>
          <form className="space-y-2" onSubmit={onVerifyEmail}>
            <input aria-label="Email verification token" value={verificationToken} onChange={(e) => setVerificationToken(e.target.value)} placeholder="Verification token" className="w-full rounded border p-2" required />
            <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Verify email</button>
          </form>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-medium">Sign in</h2>
          <form className="space-y-2" onSubmit={onLogin}>
            <input name="identifier" aria-label="Email or username" placeholder="username or email" className="w-full rounded border p-2" required />
            <input name="password" aria-label="Login password" type="password" placeholder="password" className="w-full rounded border p-2" required />
            <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Log in</button>
          </form>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-medium">Password reset</h2>
          <form className="space-y-2" onSubmit={onRequestPasswordReset}>
            <input name="email" aria-label="Email address" type="email" placeholder="email@example.com" className="w-full rounded border p-2" required />
            <button className="rounded bg-slate-700 px-4 py-2 text-white" type="submit">Request reset link</button>
          </form>
          <form className="mt-3 space-y-2" onSubmit={onResetPassword}>
            <input name="token" aria-label="Password reset token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Reset token" className="w-full rounded border p-2" required />
            <input name="newPassword" aria-label="New password" type="password" placeholder="new strong password" className="w-full rounded border p-2" required minLength={12} />
            <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Set new password</button>
          </form>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-medium">Profile</h2>
          <button className="rounded border px-4 py-2" type="button" onClick={onLoadProfile}>Load profile</button>
          <form className="mt-3 space-y-2" onSubmit={onUpdateProfile}>
            <input name="display_name" aria-label="Profile display name" defaultValue={profile?.display_name || ''} placeholder="Display name" className="w-full rounded border p-2" />
            <textarea name="bio" aria-label="Profile bio" defaultValue={profile?.bio || ''} placeholder="Bio" className="w-full rounded border p-2" rows={3} />
            <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Save profile</button>
          </form>
        </section>

        <p role="status" className="rounded bg-slate-100 p-3 text-sm">{status || 'Ready.'}</p>
      </div>
    </div>
  );
}
