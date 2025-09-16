"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BYTES_PER_MEBIBYTE = 1024 * 1024;

const formatMebibytes = (formatter: Intl.NumberFormat, bytes: number) =>
  `${formatter.format(bytes / BYTES_PER_MEBIBYTE)} MiB`;

const hasStorageEstimate = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.storage && navigator.storage.estimate);

export default function StoragePanel() {
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(0);
  const [supported, setSupported] = useState(hasStorageEstimate);
  const mounted = useRef(false);

  const updateEstimate = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      if (mounted.current) {
        setSupported(false);
        setUsage(0);
        setQuota(0);
      }
      return;
    }

    try {
      const { usage: nextUsage = 0, quota: nextQuota = 0 } =
        (await navigator.storage.estimate()) ?? {};

      if (!mounted.current) return;

      setSupported(true);
      setUsage(nextUsage);
      setQuota(nextQuota);
    } catch {
      if (!mounted.current) return;

      setSupported(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    void updateEstimate();

    if (typeof window === "undefined") {
      return () => {
        mounted.current = false;
      };
    }

    const handleStorageChange = () => {
      void updateEstimate();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      mounted.current = false;
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [updateEstimate]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
    []
  );

  if (!supported) {
    return (
      <section
        aria-live="polite"
        className="rounded border border-gray-900 bg-ub-cool-grey p-4 text-ubt-grey"
      >
        <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
        <p className="mt-2">
          Storage information is not available in this environment.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      className="rounded border border-gray-900 bg-ub-cool-grey p-4 text-ubt-grey"
    >
      <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt>Usage</dt>
          <dd data-testid="storage-usage" className="font-mono text-white">
            {formatMebibytes(formatter, usage)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Quota</dt>
          <dd data-testid="storage-quota" className="font-mono text-white">
            {formatMebibytes(formatter, quota)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
