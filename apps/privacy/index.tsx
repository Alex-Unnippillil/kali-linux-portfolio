"use client";

import ToggleSwitch from "../../components/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

const ANALYTICS_DOCS =
  "https://github.com/Alex-Unnippillil/kali-linux-portfolio#analytics";
const VERCEL_ANALYTICS_DOCS = "https://vercel.com/docs/analytics";
const SPEED_INSIGHTS_DOCS = "https://vercel.com/docs/speed-insights";

export default function PrivacyApp() {
  const {
    privacyProfile,
    setPrivacyProfile,
    analyticsConsent,
    setAnalyticsConsent,
    telemetryConsent,
    setTelemetryConsent,
    privacyProfiles,
  } = useSettings();

  const activeProfile =
    privacyProfiles.find((profile) => profile.id === privacyProfile) ||
    privacyProfiles[0];

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-ub-cool-grey p-4 text-white">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Privacy Controls</h1>
        <p className="text-sm text-ubt-grey">
          Manage analytics and operational telemetry for this desktop. Changes are
          stored per profile and applied immediately across running apps.
        </p>
      </div>

      <section className="mt-6 space-y-3">
        <label htmlFor="privacy-profile" className="text-sm font-medium">
          Active profile
        </label>
        <select
          id="privacy-profile"
          value={privacyProfile}
          onChange={(event) => setPrivacyProfile(event.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-ub-orange focus:outline-none"
        >
          {privacyProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
            </option>
          ))}
        </select>
        {activeProfile && (
          <div className="space-y-1 text-xs text-ubt-grey">
            <p>{activeProfile.description}</p>
            <a
              href={activeProfile.docs}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-ub-orange hover:underline"
            >
              Learn more about this profile
              <span aria-hidden>↗</span>
            </a>
          </div>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex flex-col gap-4 rounded border border-gray-800 bg-gray-900/70 p-4 md:flex-row md:items-center md:justify-between">
          <div className="md:max-w-xl">
            <h2 className="text-lg font-semibold">Usage analytics</h2>
            <p className="mt-1 text-sm text-ubt-grey">
              Controls Google Analytics instrumentation used for gameplay metrics,
              UI focus tracking, and other aggregate insights.
            </p>
            <a
              href={ANALYTICS_DOCS}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-xs text-ub-orange hover:underline"
            >
              View analytics implementation
              <span aria-hidden>↗</span>
            </a>
          </div>
          <ToggleSwitch
            checked={analyticsConsent}
            onChange={setAnalyticsConsent}
            ariaLabel="Toggle Google Analytics"
          />
        </div>

        <div className="flex flex-col gap-4 rounded border border-gray-800 bg-gray-900/70 p-4 md:flex-row md:items-center md:justify-between">
          <div className="md:max-w-xl">
            <h2 className="text-lg font-semibold">Operational telemetry</h2>
            <p className="mt-1 text-sm text-ubt-grey">
              Governs Vercel Analytics, Speed Insights, and custom events emitted
              through <code>analytics-client.ts</code> for infrastructure health.
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-ubt-grey">
              <a
                href={VERCEL_ANALYTICS_DOCS}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-ub-orange hover:underline"
              >
                Vercel Analytics docs
                <span aria-hidden>↗</span>
              </a>
              <a
                href={SPEED_INSIGHTS_DOCS}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-ub-orange hover:underline"
              >
                Speed Insights docs
                <span aria-hidden>↗</span>
              </a>
            </div>
          </div>
          <ToggleSwitch
            checked={telemetryConsent}
            onChange={setTelemetryConsent}
            ariaLabel="Toggle Vercel telemetry"
          />
        </div>
      </section>

      <footer className="mt-6 text-xs text-ubt-grey">
        Profile selections and toggle states are saved locally so you can switch
        between demo, personal, or locked-down configurations without clearing the
        entire desktop state.
      </footer>
    </div>
  );
}
