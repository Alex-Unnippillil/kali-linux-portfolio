'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  IncidentFormValues,
  IncidentRecord,
  addIncident,
  incidentsToCsv,
  incidentsToJson,
  listIncidents,
} from '../incidents';

const IMPACT_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const FIELD_IDS: Record<keyof IncidentFormValues, string> = {
  start: 'incident-start',
  end: 'incident-end',
  impact: 'incident-impact',
  notes: 'incident-notes',
};

const INITIAL_FORM: IncidentFormValues = {
  start: '',
  end: '',
  impact: '',
  notes: '',
};

type IncidentErrors = Partial<Record<keyof IncidentFormValues, string>>;

const sortByStart = (records: IncidentRecord[]) => {
  return [...records].sort((a, b) => {
    const aTime = Date.parse(a.start || a.createdAt);
    const bTime = Date.parse(b.start || b.createdAt);
    const aInvalid = Number.isNaN(aTime);
    const bInvalid = Number.isNaN(bTime);
    if (aInvalid && bInvalid) return 0;
    if (aInvalid) return 1;
    if (bInvalid) return -1;
    return bTime - aTime;
  });
};

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const formatDateTime = (value: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export default function IncidentPanel() {
  const [form, setForm] = useState<IncidentFormValues>(() => ({ ...INITIAL_FORM }));
  const [errors, setErrors] = useState<IncidentErrors>({});
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    listIncidents().then((items) => {
      if (mounted) {
        setIncidents(items);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const hasIncidents = incidents.length > 0;

  const handleChange = (field: keyof IncidentFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { value } = event.target;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const validate = (values: IncidentFormValues): IncidentErrors => {
    const nextErrors: IncidentErrors = {};
    if (!values.start) {
      nextErrors.start = 'Start time is required.';
    }
    if (values.end) {
      if (!values.start) {
        nextErrors.end = 'Provide a start time before setting the end time.';
      } else if (Date.parse(values.end) < Date.parse(values.start)) {
        nextErrors.end = 'End time must be after the start time.';
      }
    }
    if (!values.impact) {
      nextErrors.impact = 'Impact level is required.';
    }
    if (!values.notes.trim()) {
      nextErrors.notes = 'Notes are required.';
    }
    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed: IncidentFormValues = {
      ...form,
      notes: form.notes.trim(),
    };
    const nextErrors = validate(trimmed);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus(null);
      const firstField = Object.keys(nextErrors)[0] as keyof IncidentFormValues;
      const el = document.getElementById(FIELD_IDS[firstField]);
      el?.focus();
      return;
    }

    try {
      const record = await addIncident(trimmed);
      setIncidents((prev) => sortByStart([...prev, record]));
      setForm(() => ({ ...INITIAL_FORM }));
      setErrors({});
      setStatus('Incident recorded.');
      const el = document.getElementById(FIELD_IDS.start);
      el?.focus();
    } catch {
      setStatus('Unable to save incident. Try again.');
    }
  };

  const jsonExport = useMemo(() => (hasIncidents ? incidentsToJson(incidents) : ''), [incidents, hasIncidents]);
  const csvExport = useMemo(() => (hasIncidents ? incidentsToCsv(incidents) : ''), [incidents, hasIncidents]);

  return (
    <section aria-labelledby="incident-heading" className="mt-4 border border-gray-700 rounded bg-[var(--kali-panel)] p-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-700 pb-2 mb-3">
        <h2 id="incident-heading" className="text-sm font-semibold uppercase tracking-wide">
          Incident Tracker
        </h2>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => hasIncidents && download(jsonExport, 'ops-incidents.json', 'application/json')}
            disabled={!hasIncidents}
            className="rounded bg-[var(--kali-bg)] px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => hasIncidents && download(csvExport, 'ops-incidents.csv', 'text/csv')}
            disabled={!hasIncidents}
            className="rounded bg-[var(--kali-bg)] px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={FIELD_IDS.start} className="block text-xs font-semibold uppercase tracking-wide">
            Start time
          </label>
          <input
            id={FIELD_IDS.start}
            type="datetime-local"
            required
            value={form.start}
            onChange={handleChange('start')}
            aria-invalid={errors.start ? 'true' : undefined}
            aria-describedby={errors.start ? `${FIELD_IDS.start}-error` : undefined}
            className="mt-1 w-full rounded border border-gray-700 bg-[var(--kali-bg)] p-2 text-white"
          />
          {errors.start && (
            <p
              id={`${FIELD_IDS.start}-error`}
              className="mt-1 text-xs text-red-400"
              aria-live="polite"
            >
              {errors.start}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={FIELD_IDS.end} className="block text-xs font-semibold uppercase tracking-wide">
            End time
          </label>
          <input
            id={FIELD_IDS.end}
            type="datetime-local"
            value={form.end}
            onChange={handleChange('end')}
            aria-invalid={errors.end ? 'true' : undefined}
            aria-describedby={errors.end ? `${FIELD_IDS.end}-error` : undefined}
            className="mt-1 w-full rounded border border-gray-700 bg-[var(--kali-bg)] p-2 text-white"
          />
          {errors.end && (
            <p id={`${FIELD_IDS.end}-error`} className="mt-1 text-xs text-red-400" aria-live="polite">
              {errors.end}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={FIELD_IDS.impact} className="block text-xs font-semibold uppercase tracking-wide">
            Impact
          </label>
          <select
            id={FIELD_IDS.impact}
            required
            value={form.impact}
            onChange={handleChange('impact')}
            aria-invalid={errors.impact ? 'true' : undefined}
            aria-describedby={errors.impact ? `${FIELD_IDS.impact}-error` : undefined}
            className="mt-1 w-full rounded border border-gray-700 bg-[var(--kali-bg)] p-2 text-white"
          >
            <option value="">Select impact level</option>
            {IMPACT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.impact && (
            <p id={`${FIELD_IDS.impact}-error`} className="mt-1 text-xs text-red-400" aria-live="polite">
              {errors.impact}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label htmlFor={FIELD_IDS.notes} className="block text-xs font-semibold uppercase tracking-wide">
            Notes
          </label>
          <textarea
            id={FIELD_IDS.notes}
            required
            rows={3}
            value={form.notes}
            onChange={handleChange('notes')}
            aria-invalid={errors.notes ? 'true' : undefined}
            aria-describedby={errors.notes ? `${FIELD_IDS.notes}-error` : undefined}
            className="mt-1 w-full rounded border border-gray-700 bg-[var(--kali-bg)] p-2 text-white"
          />
          {errors.notes && (
            <p id={`${FIELD_IDS.notes}-error`} className="mt-1 text-xs text-red-400" aria-live="polite">
              {errors.notes}
            </p>
          )}
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="rounded bg-green-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-green-500 focus:outline-none focus:ring"
          >
            Log incident
          </button>
        </div>
      </form>

      <div className="mt-4" aria-live="polite" role="status">
        {status && <p className="text-xs text-gray-300">{status}</p>}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <caption className="sr-only">Logged incidents</caption>
          <thead>
            <tr className="border-b border-gray-700 text-gray-300">
              <th scope="col" className="px-2 py-1 font-semibold">
                Start
              </th>
              <th scope="col" className="px-2 py-1 font-semibold">
                End
              </th>
              <th scope="col" className="px-2 py-1 font-semibold">
                Impact
              </th>
              <th scope="col" className="px-2 py-1 font-semibold">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {!hasIncidents && (
              <tr>
                <td colSpan={4} className="px-2 py-3 text-gray-400">
                  No incidents logged yet.
                </td>
              </tr>
            )}
            {incidents.map((incident) => (
              <tr key={incident.id} className="border-b border-gray-800">
                <td className="px-2 py-2 align-top text-white">
                  {formatDateTime(incident.start)}
                </td>
                <td className="px-2 py-2 align-top text-white">
                  {incident.end ? formatDateTime(incident.end) : 'Ongoing'}
                </td>
                <td className="px-2 py-2 align-top">
                  <span className="inline-flex rounded bg-gray-800 px-2 py-0.5 text-white">
                    {incident.impact}
                  </span>
                </td>
                <td className="px-2 py-2 align-top text-gray-200 whitespace-pre-wrap">
                  {incident.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
