"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "./useSettings";
import {
  describeNMState,
  fetchMeteredStatus,
  isMetered,
  type MeteredConnectionReport,
} from "../utils/networkManager";

export const useMeteredConnection = () => {
  const {
    connectedNetworkId,
    meteredOverride,
    setMeteredOverride,
    backgroundSyncThrottle,
    setBackgroundSyncThrottle,
  } = useSettings();
  const [report, setReport] = useState<MeteredConnectionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!connectedNetworkId) return;
    setLoading(true);
    setError(null);
    fetchMeteredStatus(connectedNetworkId)
      .then((result) => setReport(result))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unable to query NetworkManager";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [connectedNetworkId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const detectedMetered = useMemo(
    () => (report ? isMetered(report.state) : false),
    [report],
  );

  const effectiveMetered = useMemo(() => {
    if (meteredOverride === "force-metered") return true;
    if (meteredOverride === "force-unmetered") return false;
    return detectedMetered;
  }, [detectedMetered, meteredOverride]);

  useEffect(() => {
    if (!effectiveMetered && backgroundSyncThrottle) {
      setBackgroundSyncThrottle(false);
    }
  }, [effectiveMetered, backgroundSyncThrottle, setBackgroundSyncThrottle]);

  return {
    connectionId: connectedNetworkId,
    report,
    loading,
    error,
    detectedMetered,
    effectiveMetered,
    override: meteredOverride,
    setOverride: setMeteredOverride,
    describeState: report ? describeNMState(report.state) : "NM_DEVICE_METERED_UNKNOWN",
    backgroundSyncThrottle,
    setBackgroundSyncThrottle,
    refresh,
  };
};
