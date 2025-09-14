'use client';

export default function DesktopPage() {
  const handleSignOut = async () => {
    await fetch('/api/session', { method: 'DELETE' });
    window.location.href = '/';
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSignOut();
  };

  return (
    <main className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-xl font-semibold">Welcome to the desktop</h1>
      <form onSubmit={onSubmit} className="flex flex-col items-center gap-2">
        <button
          type="submit"
          className="rounded bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}

