"use client";

import { useMemo } from "react";
import type { LocaleOption } from "../../../i18n";

interface LocaleOptionCardProps {
  option: LocaleOption;
  active: boolean;
  onSelect: () => void;
  sampleDate: Date;
  sampleNumber: number;
}

export default function LocaleOptionCard({
  option,
  active,
  onSelect,
  sampleDate,
  sampleNumber,
}: LocaleOptionCardProps) {
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(option.code, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(sampleDate);
    } catch {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(sampleDate);
    }
  }, [option.code, sampleDate]);

  const formattedNumber = useMemo(() => {
    try {
      return new Intl.NumberFormat(option.code).format(sampleNumber);
    } catch {
      return new Intl.NumberFormat().format(sampleNumber);
    }
  }, [option.code, sampleNumber]);

  const formattedCurrency = useMemo(() => {
    try {
      return new Intl.NumberFormat(option.code, {
        style: "currency",
        currency: option.currency,
      }).format(sampleNumber);
    } catch {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: option.currency,
      }).format(sampleNumber);
    }
  }, [option.code, option.currency, sampleNumber]);

  const id = useMemo(
    () => `locale-${option.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    [option.code],
  );
  const descriptionId = `${id}-description`;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-describedby={descriptionId}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onSelect();
        }
      }}
      tabIndex={active ? 0 : -1}
      className={`text-left rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        active
          ? "border-ub-orange bg-ub-orange/10 shadow-lg"
          : "border-gray-700 bg-black/30 hover:border-ub-orange/70"
      }`}
    >
      <div className="p-4 space-y-3" id={id}>
        <div>
          <p className="text-lg font-semibold text-white">{option.label}</p>
          <p className="text-sm text-ubt-grey">
            {option.nativeName} • {option.region}
          </p>
        </div>
        <div id={descriptionId} className="text-sm text-ubt-grey space-y-1">
          <p>
            <span className="font-medium text-white">Date:</span> {formattedDate}
          </p>
          <p>
            <span className="font-medium text-white">Number:</span> {formattedNumber}
          </p>
          <p>
            <span className="font-medium text-white">Currency:</span> {formattedCurrency}
          </p>
        </div>
      </div>
    </button>
  );
}
