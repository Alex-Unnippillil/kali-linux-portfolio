import Head from 'next/head';
import { FormEvent, useEffect, useState } from 'react';

const LoginPage = () => {
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [keyboardNavigationEnabled, setKeyboardNavigationEnabled] = useState(false);
  const [announcement, setAnnouncement] = useState(
    'Greeter loaded with standard accessibility preferences. Toggle any option to personalize the experience.',
  );
  const [loginStatus, setLoginStatus] = useState('');

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const { body } = document;
    body.classList.toggle('high-contrast', highContrastEnabled);
    return () => {
      body.classList.remove('high-contrast');
    };
  }, [highContrastEnabled]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const { body } = document;
    const className = 'screen-reader-mode';
    body.classList.toggle(className, screenReaderEnabled);
    return () => {
      body.classList.remove(className);
    };
  }, [screenReaderEnabled]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const { body } = document;
    const className = 'keyboard-nav-mode';
    body.classList.toggle(className, keyboardNavigationEnabled);
    return () => {
      body.classList.remove(className);
    };
  }, [keyboardNavigationEnabled]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get('username') || 'guest');
    setLoginStatus(
      `Simulation ready for ${username}. Press the launch button below to open the desktop environment.`,
    );
    setAnnouncement('Login form submitted. Guidance updated in the status region.');
  };

  const describedBy = [
    screenReaderEnabled ? 'screen-reader-instructions' : null,
    keyboardNavigationEnabled ? 'keyboard-focus-guide' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300 ease-in-out`}
    >
      <Head>
        <title>Kali Portfolio Greeter</title>
      </Head>
      <a href="#login-main" className="skip-link">
        Skip to the login form
      </a>
      <main
        id="login-main"
        role="main"
        tabIndex={-1}
        className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12 focus-visible:outline-none"
        aria-describedby={describedBy || undefined}
      >
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-widest text-[var(--color-ubt-grey)]">
            Kali Linux Portfolio
          </p>
          <h1 className="text-3xl font-semibold">Welcome back, Operator</h1>
          <p className="max-w-xl text-base text-[var(--color-ubt-grey)]">
            This greeter keeps your preferred accessibility aids close at hand. Choose the options that
            support your workflow before launching the simulated desktop.
          </p>
        </header>

        <section
          aria-label="Accessibility preferences"
          className="rounded-lg border border-[var(--color-ub-border-orange)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_20%)] p-6 shadow-lg"
        >
          <h2 className="text-2xl font-medium">Accessibility toggles</h2>
          <p className="mt-2 text-sm text-[var(--color-ubt-grey)]">
            Every toggle updates the live region so assistive technology announces the new state.
          </p>
          <div className="mt-6 grid gap-4" role="group" aria-label="Interface toggles">
            <div className="rounded-md border border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_10%)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">High contrast theme</p>
                  <p id="toggle-high-contrast" className="text-sm text-[var(--color-ubt-grey)]">
                    Apply the design system&apos;s high contrast color tokens for maximum legibility.
                  </p>
                </div>
                <button
                  type="button"
                  className={`min-h-[var(--hit-area)] min-w-[var(--hit-area)] rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none ${
                    highContrastEnabled
                      ? 'border-[var(--color-ub-border-orange)] bg-[var(--color-ub-lite-abrgn)] text-black'
                      : 'border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_30%)]'
                  }`}
                  aria-pressed={highContrastEnabled}
                  aria-label="High contrast theme"
                  aria-describedby="toggle-high-contrast"
                  onClick={() => {
                    setHighContrastEnabled((prev) => {
                      const next = !prev;
                      setAnnouncement(
                        `High contrast theme ${next ? 'enabled' : 'disabled'}. Color tokens now ` +
                          `${next ? 'use the high contrast palette.' : 'return to the base theme.'}`,
                      );
                      return next;
                    });
                  }}
                >
                  {highContrastEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            <div className="rounded-md border border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_10%)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Screen reader hints</p>
                  <p id="toggle-screen-reader" className="text-sm text-[var(--color-ubt-grey)]">
                    Adds extra descriptions and keeps announcements in the live region for narrators.
                  </p>
                </div>
                <button
                  type="button"
                  className={`min-h-[var(--hit-area)] min-w-[var(--hit-area)] rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none ${
                    screenReaderEnabled
                      ? 'border-[var(--color-ub-border-orange)] bg-[var(--color-ub-lite-abrgn)] text-black'
                      : 'border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_30%)]'
                  }`}
                  aria-pressed={screenReaderEnabled}
                  aria-label="Screen reader hints"
                  aria-describedby="toggle-screen-reader"
                  onClick={() => {
                    setScreenReaderEnabled((prev) => {
                      const next = !prev;
                      setAnnouncement(
                        `Screen reader hints ${next ? 'enabled' : 'disabled'}. ${
                          next
                            ? 'Additional descriptions are now attached to the login form.'
                            : 'Descriptions return to their concise defaults.'
                        }`,
                      );
                      return next;
                    });
                  }}
                >
                  {screenReaderEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            <div className="rounded-md border border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_10%)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Keyboard navigation guide</p>
                  <p id="toggle-keyboard" className="text-sm text-[var(--color-ubt-grey)]">
                    Highlights focus outlines and lists the order of focusable elements.
                  </p>
                </div>
                <button
                  type="button"
                  className={`min-h-[var(--hit-area)] min-w-[var(--hit-area)] rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none ${
                    keyboardNavigationEnabled
                      ? 'border-[var(--color-ub-border-orange)] bg-[var(--color-ub-lite-abrgn)] text-black'
                      : 'border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_30%)]'
                  }`}
                  aria-pressed={keyboardNavigationEnabled}
                  aria-label="Keyboard navigation guide"
                  aria-describedby="toggle-keyboard"
                  onClick={() => {
                    setKeyboardNavigationEnabled((prev) => {
                      const next = !prev;
                      setAnnouncement(
                        `Keyboard navigation guide ${next ? 'enabled' : 'disabled'}. ${
                          next
                            ? 'Focus order is described and focus outlines are emphasized.'
                            : 'Focus styles return to their default weight.'
                        }`,
                      );
                      return next;
                    });
                  }}
                >
                  {keyboardNavigationEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>

          {screenReaderEnabled && (
            <div
              id="screen-reader-instructions"
              role="note"
              aria-live="polite"
              className="mt-6 rounded-md border border-dashed border-[var(--color-ub-border-orange)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_40%)] p-4 text-sm"
            >
              Narrator mode adds explicit descriptions to each form control. After submitting, listen for the
              live status message confirming that the simulation continues into the desktop.
            </div>
          )}

          {keyboardNavigationEnabled && (
            <nav
              id="keyboard-focus-guide"
              aria-label="Focus order guidance"
              aria-live="polite"
              className="mt-6 rounded-md border border-dashed border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_40%)] p-4 text-sm"
            >
              <h3 className="text-base font-semibold">Focus order</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Skip link jumps directly to the login form.</li>
                <li>The three accessibility toggles appear next.</li>
                <li>Username field, password field, and the launch button follow.</li>
                <li>Live status region announces outcomes without stealing focus.</li>
              </ol>
            </nav>
          )}
        </section>

        <section
          aria-labelledby="login-title"
          className="rounded-lg border border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_10%)] p-6 shadow-lg"
        >
          <h2 id="login-title" className="text-2xl font-medium">
            Launch the simulation
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ubt-grey)]">
            Credentials are not required for the demo. Use the fields to practise with your assistive
            technology and then start the experience.
          </p>
          <form
            className="mt-6 grid gap-4"
            aria-describedby={screenReaderEnabled ? 'login-extra-details' : undefined}
            onSubmit={handleSubmit}
          >
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="username">
              Username
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className="rounded-md border border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_20%)] px-3 py-2 text-base text-[var(--color-text)] focus-visible:outline-none"
                aria-required="true"
                aria-describedby={screenReaderEnabled ? 'username-hint' : undefined}
                required
              />
              {screenReaderEnabled && (
                <span id="username-hint" className="text-xs text-[var(--color-ubt-grey)]">
                  Provide any identifier so the confirmation message can reference you by name.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="password">
              Password
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="rounded-md border border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_20%)] px-3 py-2 text-base text-[var(--color-text)] focus-visible:outline-none"
                aria-required="true"
                aria-describedby={screenReaderEnabled ? 'password-hint' : undefined}
                required
              />
              {screenReaderEnabled && (
                <span id="password-hint" className="text-xs text-[var(--color-ubt-grey)]">
                  Any value works in the simulation. The field exists to rehearse secure entry habits.
                </span>
              )}
            </label>

            {screenReaderEnabled && (
              <p id="login-extra-details" className="text-xs text-[var(--color-ubt-grey)]">
                Press the launch button to finish. Focus stays on the button while the live region announces the
                transition.
              </p>
            )}

            <button
              type="submit"
              className="mt-2 inline-flex items-center justify-center rounded-md bg-[var(--color-ub-orange)] px-5 py-3 text-base font-semibold text-black shadow focus-visible:outline-none"
            >
              Launch desktop
            </button>
          </form>
        </section>

        <section
          aria-live="assertive"
          role="status"
          data-testid="announcement-region"
          className="rounded-md border border-[var(--color-muted)] bg-[color-mix(in_srgb,_var(--color-bg),_transparent_15%)] p-4 text-sm"
        >
          <p className="font-semibold">Live announcements</p>
          <p className="mt-2">{announcement}</p>
          {loginStatus && <p className="mt-2">{loginStatus}</p>}
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
