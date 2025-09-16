"use client";

import { useEffect, useState } from "react";
import ToggleSwitch from "../ToggleSwitch";
import {
  ANALYTICS_CONSENT,
  type AnalyticsConsentValue,
  getAnalyticsConsent,
  initializeAnalytics,
  isAnalyticsEnabled,
  isAnalyticsEnvEnabled,
  setAnalyticsConsent,
} from "../../lib/analytics";

export default function AnalyticsSettings() {
  const envEnabled = isAnalyticsEnvEnabled();
  const [consent, setConsent] = useState<AnalyticsConsentValue | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!envEnabled) {
      setConsent(null);
      setEnabled(false);
      return;
    }
    setConsent(getAnalyticsConsent());
    setEnabled(isAnalyticsEnabled());
  }, [envEnabled]);

  const handleToggle = (next: boolean) => {
    if (!envEnabled) return;
    if (next) {
      setAnalyticsConsent(ANALYTICS_CONSENT.GRANTED);
      initializeAnalytics();
      setConsent(ANALYTICS_CONSENT.GRANTED);
      setEnabled(true);
    } else {
      setAnalyticsConsent(ANALYTICS_CONSENT.DENIED);
      setConsent(ANALYTICS_CONSENT.DENIED);
      setEnabled(false);
    }
  };

  const statusLabel = !envEnabled
    ? "Disabled by environment"
    : enabled
    ? "Enabled"
    : consent === ANALYTICS_CONSENT.DENIED
    ? "Declined"
    : "Awaiting consent";

  return (
    <div className="w-full max-w-xl mx-auto rounded-lg border border-gray-700 bg-ub-cool-grey/80 p-4 text-white shadow-lg space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Analytics preferences</h2>
        <p className="text-sm text-ubt-grey">
          Control whether Google Analytics collects anonymous usage statistics. These metrics help
          improve the Kali Linux desktop experience.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Google Analytics</p>
          <p className="text-xs text-ubt-grey">Toggle anonymous usage tracking for desktop apps.</p>
        </div>
        <ToggleSwitch
          checked={envEnabled && enabled}
          onChange={handleToggle}
          ariaLabel="Allow Google Analytics"
          className={envEnabled ? "" : "opacity-50 cursor-not-allowed"}
        />
      </div>
      <p className="text-xs text-ubt-grey">Status: {statusLabel}</p>
      <p className="text-xs text-ubt-grey">
        Your choice is stored locally. You can revisit this panel or use the consent prompt on first
        load to change it at any time.
      </p>
    </div>
  );
}
