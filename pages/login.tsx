import Head from 'next/head';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import ToggleSwitch from '../components/ToggleSwitch';
import { useShellConfig } from '../hooks/useShellConfig';

const LoginPage = () => {
  const router = useRouter();
  const { safeMode, optionalAppIds, setSafeMode } = useShellConfig();
  const [launchSafeMode, setLaunchSafeMode] = useState(safeMode);

  useEffect(() => {
    setLaunchSafeMode(safeMode);
  }, [safeMode]);

  const disabledSummary = useMemo(() => {
    if (!launchSafeMode) {
      return 'Safe mode off. All modules and plugins will load.';
    }
    if (!optionalAppIds.length) return 'No optional modules registered.';
    if (optionalAppIds.length <= 3) {
      return `Will disable: ${optionalAppIds.join(', ')}`;
    }
    const preview = optionalAppIds.slice(0, 3).join(', ');
    return `Will disable ${optionalAppIds.length} modules (e.g. ${preview}, …)`;
  }, [launchSafeMode, optionalAppIds]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSafeMode(launchSafeMode);
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>Kali Portfolio – Login</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black p-6 text-white">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg rounded-xl border border-white/10 bg-black/70 p-8 shadow-xl backdrop-blur"
          aria-labelledby="login-title"
        >
          <h1 id="login-title" className="text-2xl font-semibold text-ub-orange">
            Desktop greeter
          </h1>
          <p className="mt-2 text-sm text-ubt-ice-white/80">
            Choose how you want to boot the simulated Kali desktop. Safe mode keeps only the core shell components and
            skips optional extensions and plugins.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <ToggleSwitch
              checked={launchSafeMode}
              onChange={setLaunchSafeMode}
              ariaLabel="Toggle safe mode"
            />
            <div>
              <p className="text-sm font-medium">Launch in safe mode</p>
              <p className="text-xs text-ubt-ice-white/70">{disabledSummary}</p>
            </div>
          </div>

          <button
            type="submit"
            className="mt-8 w-full rounded-md bg-ub-orange py-2 text-sm font-semibold text-black transition hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Boot desktop
          </button>
        </form>
      </main>
    </>
  );
};

export default LoginPage;
