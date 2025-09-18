import React, { useMemo, useState } from 'react';
import {
  TRUSTED_ORIGIN,
  CsrfRequest,
  CsrfRules,
  defaultRequest,
  defaultRules,
  evaluateCsrfRequest,
  summarizeRules,
} from './csrfLabLogic';

const CSRFLab: React.FC = () => {
  const [rules, setRules] = useState<CsrfRules>(defaultRules);
  const [request, setRequest] = useState<CsrfRequest>(defaultRequest);

  const evaluation = useMemo(() => evaluateCsrfRequest(request, rules), [request, rules]);
  const ruleSummaries = useMemo(() => summarizeRules(rules), [rules]);

  const activeRules = ruleSummaries.filter((rule) => rule.enabled);
  const disabledRules = ruleSummaries.filter((rule) => !rule.enabled);

  return (
    <section
      className="space-y-4 rounded border border-gray-700 bg-gray-800 p-4 text-white"
      aria-label="CSRF lab"
    >
      <div>
        <h2 className="text-xl font-semibold">CSRF Lab</h2>
        <p className="mt-1 text-sm text-gray-300">
          Toggle the defences and craft requests to understand how cross-site request forgery protections respond.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3" role="group" aria-label="CSRF lab layout">
        <div className="space-y-3 rounded border border-gray-700 bg-gray-900 p-3">
          <h3 className="text-lg font-semibold">Control panel</h3>
          <p className="text-xs text-gray-300">
            Origin and Referer checks start disabled so learners can observe the vulnerable baseline before hardening the route.
          </p>
          <fieldset className="space-y-2">
            <legend className="sr-only">CSRF defences</legend>
            <label className="flex items-start gap-2 text-sm" htmlFor="csrf-require-session">
              <input
                id="csrf-require-session"
                type="checkbox"
                className="mt-1"
                aria-label="Require session cookie"
                checked={rules.requireSession}
                onChange={(e) => setRules((prev) => ({ ...prev, requireSession: e.target.checked }))}
              />
              <span>
                Require session cookie
                <span className="block text-xs text-gray-400">
                  Rejects unauthenticated requests by insisting on the session cookie.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm" htmlFor="csrf-validate-token">
              <input
                id="csrf-validate-token"
                type="checkbox"
                className="mt-1"
                aria-label="Validate CSRF token"
                checked={rules.requireToken}
                onChange={(e) => setRules((prev) => ({ ...prev, requireToken: e.target.checked }))}
              />
              <span>
                Validate CSRF token
                <span className="block text-xs text-gray-400">
                  Requires the X-CSRF-Token header to match the csrfToken cookie value.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm" htmlFor="csrf-validate-origin">
              <input
                id="csrf-validate-origin"
                type="checkbox"
                className="mt-1"
                aria-label="Validate Origin header"
                checked={rules.checkOrigin}
                onChange={(e) => setRules((prev) => ({ ...prev, checkOrigin: e.target.checked }))}
              />
              <span>
                Validate Origin header
                <span className="block text-xs text-gray-400">
                  Only accepts requests that send <code className="font-mono">{TRUSTED_ORIGIN}</code> in the Origin header.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm" htmlFor="csrf-validate-referer">
              <input
                id="csrf-validate-referer"
                type="checkbox"
                className="mt-1"
                aria-label="Validate Referer header"
                checked={rules.checkReferer}
                onChange={(e) => setRules((prev) => ({ ...prev, checkReferer: e.target.checked }))}
              />
              <span>
                Validate Referer header
                <span className="block text-xs text-gray-400">
                  Requires the Referer to begin with <code className="font-mono">{TRUSTED_ORIGIN}</code>.
                </span>
              </span>
            </label>
          </fieldset>
        </div>
        <div className="space-y-3 rounded border border-gray-700 bg-gray-900 p-3">
          <h3 className="text-lg font-semibold">Request under test</h3>
          <p className="text-xs text-gray-300">
            Adjust headers and cookies to represent either a legitimate form submission or a cross-site attack.
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <label className="mb-1 block font-medium" htmlFor="csrf-method">
                HTTP method
              </label>
              <select
                id="csrf-method"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                aria-label="HTTP method for request"
                value={request.method}
                onChange={(e) => setRequest((prev) => ({ ...prev, method: e.target.value }))}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="csrf-session-cookie">
                Session cookie
              </label>
              <input
                id="csrf-session-cookie"
                type="text"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                aria-label="Session cookie"
                value={request.sessionCookie}
                onChange={(e) => setRequest((prev) => ({ ...prev, sessionCookie: e.target.value }))}
                placeholder="sessionId=abc123"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="csrf-cookie">
                csrfToken cookie value
              </label>
              <input
                id="csrf-cookie"
                type="text"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                aria-label="csrfToken cookie value"
                value={request.csrfCookie}
                onChange={(e) => setRequest((prev) => ({ ...prev, csrfCookie: e.target.value }))}
                placeholder="demo-token"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="csrf-header">
                X-CSRF-Token header
              </label>
              <input
                id="csrf-header"
                type="text"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                aria-label="X-CSRF-Token header value"
                value={request.csrfHeader}
                onChange={(e) => setRequest((prev) => ({ ...prev, csrfHeader: e.target.value }))}
                placeholder="demo-token"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="csrf-origin">
                Origin header
              </label>
              <input
                id="csrf-origin"
                type="text"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                aria-label="Origin header"
                value={request.origin}
                onChange={(e) => setRequest((prev) => ({ ...prev, origin: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="csrf-referer">
                Referer header
              </label>
              <input
                id="csrf-referer"
                type="text"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                aria-label="Referer header"
                value={request.referer}
                onChange={(e) => setRequest((prev) => ({ ...prev, referer: e.target.value }))}
                placeholder="https://example.com/form"
              />
            </div>
          </div>
        </div>
        <aside className="space-y-3 rounded border border-gray-700 bg-gray-900 p-3">
          <div>
            <h3 className="text-lg font-semibold">Effective rule set</h3>
            <p className="text-xs text-gray-300">
              Trusted origin: <code className="font-mono text-gray-100">{TRUSTED_ORIGIN}</code>
            </p>
            {activeRules.length ? (
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-green-300">
                {activeRules.map((rule) => (
                  <li key={rule.id}>{rule.detail}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-yellow-300">
                No additional origin or referer validations are active. Cross-site requests rely solely on token checks.
              </p>
            )}
            {disabledRules.length > 0 && (
              <div className="mt-3 border-t border-gray-700 pt-3">
                <h4 className="text-sm font-semibold text-gray-200">Disabled controls</h4>
                <ul className="mt-1 space-y-1 text-xs text-gray-400">
                  {disabledRules.map((rule) => (
                    <li key={rule.id}>{rule.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div
            className={`rounded border p-3 text-sm ${
              evaluation.ok
                ? 'border-green-600 bg-green-900 text-green-100'
                : 'border-red-600 bg-red-900 text-red-100'
            }`}
            role="status"
            aria-live="polite"
          >
            <h4 className="text-base font-semibold">
              {evaluation.ok ? 'Request accepted' : 'Request rejected'}
            </h4>
            <p className="mt-1">{evaluation.message}</p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default CSRFLab;
