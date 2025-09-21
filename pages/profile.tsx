import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

type ProfileFormState = {
  email: string;
  fullName: string;
  username: string;
  bio: string;
  imageDataUrl: string | null;
};

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const DEFAULT_PROFILE: ProfileFormState = {
  email: '',
  fullName: '',
  username: '',
  bio: '',
  imageDataUrl: null,
};

const STORAGE_KEY = 'account-profile';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ProfilePage = () => {
  const [form, setForm] = useState<ProfileFormState>(DEFAULT_PROFILE);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  // Load previously saved profile data from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<ProfileFormState>;
      setForm((prev) => ({
        ...prev,
        ...parsed,
        imageDataUrl: parsed.imageDataUrl ?? null,
      }));
    } catch (error) {
      console.warn('Failed to load saved profile data', error);
    }
  }, []);

  const imagePreview = useMemo(() => form.imageDataUrl, [form.imageDataUrl]);

  const updateForm = (key: keyof ProfileFormState, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      updateForm('imageDataUrl', null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateForm('imageDataUrl', typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => {
      setStatus('error');
      setMessage('Failed to read the selected image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('idle');
    setMessage('');

    if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
      setStatus('error');
      setMessage('Please provide a valid email address.');
      return;
    }
    if (!form.fullName.trim()) {
      setStatus('error');
      setMessage('Full name is required.');
      return;
    }
    if (!form.username.trim()) {
      setStatus('error');
      setMessage('A username is required.');
      return;
    }

    setStatus('loading');
    try {
      // Simulate a network request to update the profile.
      await new Promise((resolve) => setTimeout(resolve, 650));

      if (typeof window !== 'undefined') {
        const toPersist = JSON.stringify(form);
        window.localStorage.setItem(STORAGE_KEY, toPersist);
      }

      setStatus('success');
      setMessage('Profile updated successfully.');
      setTouched(false);
    } catch (error) {
      console.error('Failed to update profile', error);
      setStatus('error');
      setMessage('Something went wrong while updating your profile.');
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_PROFILE);
    setTouched(false);
    setStatus('idle');
    setMessage('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Workspace</p>
            <h1 className="text-2xl font-semibold text-white">Account Profile</h1>
            <p className="text-sm text-slate-400">Update your account. Check out the OpenAI Playground!</p>
          </div>
          <nav aria-label="Secondary">
            <ul className="flex flex-wrap gap-3 text-sm text-slate-300">
              {['Blogs', 'Work', 'Dashboard', 'Projects', 'Music', 'Contact'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="rounded-full border border-slate-800 px-3 py-1 transition hover:border-slate-700 hover:text-white"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-8 lg:grid-cols-[320px,1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <h2 className="text-lg font-medium text-white">Profile image</h2>
            <p className="mt-2 text-sm text-slate-400">
              Upload a square image to personalise your account. Supported formats: PNG or JPEG.
            </p>
            <div className="mt-5 flex flex-col items-center gap-4">
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-slate-500">No image selected</span>
                )}
              </div>
                <label
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-500"
                  htmlFor="profile-image"
                >
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Upload profile image"
                  />
                Upload image
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => updateForm('imageDataUrl', null)}
                  className="text-xs text-slate-400 underline hover:text-slate-200"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  aria-label="Email address"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  aria-label="Full name"
                  type="text"
                  value={form.fullName}
                  onChange={(event) => updateForm('fullName', event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Ada Lovelace"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  aria-label="Username"
                  type="text"
                  value={form.username}
                  onChange={(event) => updateForm('username', event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="cybernaut"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="bio">
                  Bio
                </label>
                <textarea
                  id="bio"
                  aria-label="Bio"
                  value={form.bio}
                  onChange={(event) => updateForm('bio', event.target.value)}
                  className="min-h-[96px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Short description about you"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {status === 'loading' ? 'Updating…' : 'Update account'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-slate-400 underline-offset-4 transition hover:text-slate-200 hover:underline"
              >
                Sign out
              </button>
              {touched && status === 'idle' && (
                <span className="text-xs text-slate-400" aria-live="polite">
                  Unsaved changes
                </span>
              )}
            </div>

            {status === 'success' && (
              <p role="status" className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
                {message}
              </p>
            )}
            {status === 'error' && (
              <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
                {message}
              </p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
