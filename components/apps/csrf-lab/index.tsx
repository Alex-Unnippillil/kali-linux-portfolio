'use client';

import React, { useState } from 'react';

type ValidationResult = {
  status: 'success' | 'error';
  message: string;
};

type ResultMessageProps = {
  result: ValidationResult | null;
};

const generateToken = () => Math.random().toString(36).slice(2, 10).toUpperCase();

const buttonClass =
  'inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded border border-gray-500 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900';

const ResultMessage: React.FC<ResultMessageProps> = ({ result }) => {
  if (!result) return null;

  const baseStyles =
    'mt-4 rounded border px-4 py-3 text-sm' +
    (result.status === 'success'
      ? ' border-green-500 bg-green-600/20 text-green-200'
      : ' border-red-500 bg-red-600/20 text-red-200');

  return (
    <div role="status" aria-live="polite" className={baseStyles}>
      {result.message}
    </div>
  );
};

const CSRFLab: React.FC = () => {
  const [sessionToken, setSessionToken] = useState<string>(() => generateToken());
  const [syncFormToken, setSyncFormToken] = useState<string>(sessionToken);
  const [syncIncludeToken, setSyncIncludeToken] = useState(true);
  const [synchronizerResult, setSynchronizerResult] = useState<ValidationResult | null>(null);

  const [doubleCookieValue, setDoubleCookieValue] = useState<string>(() => generateToken());
  const [doubleFormToken, setDoubleFormToken] = useState<string>(doubleCookieValue);
  const [doubleIncludeToken, setDoubleIncludeToken] = useState(true);
  const [doubleSendCookie, setDoubleSendCookie] = useState(true);
  const [doubleResult, setDoubleResult] = useState<ValidationResult | null>(null);

  const resetSynchronizerFlow = () => {
    const token = generateToken();
    setSessionToken(token);
    setSyncFormToken(token);
    setSyncIncludeToken(true);
    setSynchronizerResult(null);
  };

  const handleSynchronizerSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitted = syncIncludeToken ? syncFormToken.trim() : '';

    if (!submitted) {
      setSynchronizerResult({
        status: 'error',
        message:
          'Request rejected: the hidden CSRF token was missing, so the server cannot tell the submission apart from a forged request.',
      });
      return;
    }

    if (submitted !== sessionToken) {
      setSynchronizerResult({
        status: 'error',
        message:
          'Request rejected: the submitted token does not match the one stored in the session. Attackers often replay stale forms or tamper with this value.',
      });
      return;
    }

    setSynchronizerResult({
      status: 'success',
      message: 'Success: the hidden token matches the session token, so the server accepts the state-changing request.',
    });
  };

  const resetDoubleSubmitFlow = () => {
    const token = generateToken();
    setDoubleCookieValue(token);
    setDoubleFormToken(token);
    setDoubleIncludeToken(true);
    setDoubleSendCookie(true);
    setDoubleResult(null);
  };

  const handleDoubleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cookieValue = doubleSendCookie ? doubleCookieValue : '';
    const submitted = doubleIncludeToken ? doubleFormToken.trim() : '';

    if (!cookieValue && !submitted) {
      setDoubleResult({
        status: 'error',
        message:
          'Request rejected: neither the cookie nor the form token arrived. Without the pair, the server treats the submission as untrusted.',
      });
      return;
    }

    if (!cookieValue) {
      setDoubleResult({
        status: 'error',
        message:
          'Request rejected: the browser did not send the CSRF cookie, so the server assumes the request was forged from another origin.',
      });
      return;
    }

    if (!submitted) {
      setDoubleResult({
        status: 'error',
        message:
          'Request rejected: the hidden field was missing. Even though the cookie arrived, the server expects the form to echo the same value to prove user intent.',
      });
      return;
    }

    if (cookieValue !== submitted) {
      setDoubleResult({
        status: 'error',
        message:
          'Request rejected: the cookie and hidden field do not match. The mismatch signals that an attacker modified the request.',
      });
      return;
    }

    setDoubleResult({
      status: 'success',
      message:
        'Success: the cookie value and hidden field agree, so the server accepts the request under the double-submit cookie pattern.',
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey p-6 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-sky-200">CSRF Lab</h1>
          <p className="text-sm text-gray-200">
            Experiment with the two most common Cross-Site Request Forgery defenses. Toggle the controls to mimic how servers
            validate synchronizer tokens and double-submit cookies. Nothing is sent to a backend&mdash;the validation happens on
            this page to illustrate the decision tree.
          </p>
        </header>

        <section className="rounded-lg border border-gray-700 bg-gray-900/70 p-5 shadow-inner">
          <header className="mb-4 space-y-1">
            <h2 className="text-2xl font-semibold text-sky-100">Synchronizer Token Pattern</h2>
            <p className="text-sm text-gray-300">
              The server stores a per-session token and embeds it in each HTML form. When the form is submitted, the backend compares the
              hidden field with the session value.
            </p>
          </header>

          <ol className="list-decimal space-y-2 rounded border border-gray-700 bg-gray-800/60 p-4 text-sm text-gray-300">
            <li>Issue a form after storing a unique token in the user&apos;s session.</li>
            <li>Require the browser to echo that hidden token back on submission.</li>
            <li>Reject the request if the token is missing or does not match the stored value.</li>
          </ol>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded border border-gray-700 bg-gray-800/60 p-4">
              <h3 className="text-sm font-semibold text-gray-100">Server session token</h3>
              <p className="mt-2 font-mono text-lg tracking-wide text-sky-300" data-testid="synchronizer-session-token">
                {sessionToken}
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Regenerate the session token to mimic the server issuing a fresh form.
              </p>
              <button type="button" className={`${secondaryButtonClass} mt-3 w-full md:w-auto`} onClick={resetSynchronizerFlow}>
                Issue new token
              </button>
            </div>
            <div className="rounded border border-gray-700 bg-gray-800/60 p-4">
              <h3 className="text-sm font-semibold text-gray-100">Form submission controls</h3>
              <form className="mt-3 space-y-4" onSubmit={handleSynchronizerSubmit}>
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    id="sync-include-token"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-500"
                    checked={syncIncludeToken}
                    onChange={(event) => setSyncIncludeToken(event.target.checked)}
                    aria-label="Include hidden CSRF token"
                  />
                  <label htmlFor="sync-include-token" className="cursor-pointer">
                    Include hidden token field in the request
                  </label>
                </div>
                <div>
                  <label htmlFor="synchronizer-form-token" className="mb-1 block text-sm font-medium text-gray-200">
                    Hidden field value
                  </label>
                  <input
                    id="synchronizer-form-token"
                    type="text"
                    value={syncFormToken}
                    onChange={(event) => setSyncFormToken(event.target.value)}
                    disabled={!syncIncludeToken}
                    className="w-full rounded border border-gray-600 bg-gray-900 p-2 font-mono text-sky-200 disabled:cursor-not-allowed disabled:bg-gray-900/40"
                    aria-describedby="synchronizer-token-help"
                    aria-label="Hidden CSRF token value"
                  />
                  <p id="synchronizer-token-help" className="mt-1 text-xs text-gray-400">
                    Edit the value to mimic a forged request or leave it untouched to simulate a legitimate browser submission.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="submit" className={`${buttonClass} sm:w-auto`}>Validate request</button>
                  <button type="button" className={`${secondaryButtonClass} sm:w-auto`} onClick={() => setSyncFormToken(sessionToken)}>
                    Reset hidden field
                  </button>
                </div>
              </form>
            </div>
          </div>

          <ResultMessage result={synchronizerResult} />
        </section>

        <section className="rounded-lg border border-gray-700 bg-gray-900/70 p-5 shadow-inner">
          <header className="mb-4 space-y-1">
            <h2 className="text-2xl font-semibold text-sky-100">Double-Submit Cookie Pattern</h2>
            <p className="text-sm text-gray-300">
              The backend sets a CSRF cookie and expects the same value inside the form. Matching values confirm that the browser, not a third-party site, initiated the submission.
            </p>
          </header>

          <ol className="list-decimal space-y-2 rounded border border-gray-700 bg-gray-800/60 p-4 text-sm text-gray-300">
            <li>Set a cookie with a random value when the user visits the site.</li>
            <li>Embed the same value in a hidden field inside state-changing forms.</li>
            <li>On submission, require both the cookie and hidden field to be present and identical.</li>
          </ol>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded border border-gray-700 bg-gray-800/60 p-4">
              <h3 className="text-sm font-semibold text-gray-100">Simulated browser cookie</h3>
              <p className="mt-2 font-mono text-lg tracking-wide text-amber-200" data-testid="double-cookie-value">
                {doubleCookieValue}
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Toggle the checkbox below to mimic the browser withholding the cookie from a cross-site request.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-200">
                <input
                  id="double-send-cookie"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-500"
                  checked={doubleSendCookie}
                  onChange={(event) => setDoubleSendCookie(event.target.checked)}
                  aria-label="Send CSRF cookie"
                />
                <label htmlFor="double-send-cookie" className="cursor-pointer">
                  Browser sends CSRF cookie with the request
                </label>
              </div>
              <button type="button" className={`${secondaryButtonClass} mt-3 w-full md:w-auto`} onClick={resetDoubleSubmitFlow}>
                Refresh cookie
              </button>
            </div>
            <div className="rounded border border-gray-700 bg-gray-800/60 p-4">
              <h3 className="text-sm font-semibold text-gray-100">Form submission controls</h3>
              <form className="mt-3 space-y-4" onSubmit={handleDoubleSubmit}>
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    id="double-include-token"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-500"
                    checked={doubleIncludeToken}
                    onChange={(event) => setDoubleIncludeToken(event.target.checked)}
                    aria-label="Include hidden CSRF field"
                  />
                  <label htmlFor="double-include-token" className="cursor-pointer">
                    Include hidden field in the form submission
                  </label>
                </div>
                <div>
                  <label htmlFor="double-submit-token" className="mb-1 block text-sm font-medium text-gray-200">
                    Hidden field value
                  </label>
                  <input
                    id="double-submit-token"
                    type="text"
                    value={doubleFormToken}
                    onChange={(event) => setDoubleFormToken(event.target.value)}
                    disabled={!doubleIncludeToken}
                    className="w-full rounded border border-gray-600 bg-gray-900 p-2 font-mono text-amber-200 disabled:cursor-not-allowed disabled:bg-gray-900/40"
                    aria-describedby="double-submit-token-help"
                    aria-label="Hidden CSRF cookie value"
                  />
                  <p id="double-submit-token-help" className="mt-1 text-xs text-gray-400">
                    Adjust the hidden field to simulate tampering. The server expects it to match the cookie exactly.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="submit" className={`${buttonClass} sm:w-auto`}>Validate request</button>
                  <button
                    type="button"
                    className={`${secondaryButtonClass} sm:w-auto`}
                    onClick={() => setDoubleFormToken(doubleCookieValue)}
                  >
                    Reset hidden field
                  </button>
                </div>
              </form>
            </div>
          </div>

          <ResultMessage result={doubleResult} />
        </section>
      </div>
    </div>
  );
};

export default CSRFLab;
