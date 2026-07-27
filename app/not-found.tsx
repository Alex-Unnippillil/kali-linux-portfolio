import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-xl text-base text-slate-600 dark:text-slate-300">
        The window you are looking for has been closed or never existed. Return to the desktop to open another
        experience.
      </p>
      <Link
        href="/"
        className="rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        Return to desktop
      </Link>
    </div>
  );
}
