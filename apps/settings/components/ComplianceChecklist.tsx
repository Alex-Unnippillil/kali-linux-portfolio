"use client";

import { useMemo, useRef } from "react";
import {
  COMPLIANCE_ITEMS,
  COMPLIANCE_STATUS_OPTIONS,
  ComplianceChecklistState,
  ComplianceStatus,
  deserializeComplianceChecklist,
  serializeComplianceChecklist,
} from "../../../utils/complianceChecklist";

type Props = {
  state: ComplianceChecklistState;
  onChange: (state: ComplianceChecklistState) => void;
};

const statusClassNames: Record<ComplianceStatus, string> = {
  "not-started": "bg-gray-700 text-gray-100",
  "in-progress": "bg-yellow-600 text-white",
  blocked: "bg-red-700 text-white",
  compliant: "bg-green-600 text-white",
  "not-applicable": "bg-slate-600 text-white",
};

const statusLabels = COMPLIANCE_STATUS_OPTIONS.reduce<Record<ComplianceStatus, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {
    "not-started": "Not started",
    "in-progress": "In progress",
    blocked: "Blocked",
    compliant: "Compliant",
    "not-applicable": "Not applicable",
  }
);

const ComplianceChecklist = ({ state, onChange }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo(() => {
    const map = new Map(state.items.map((item) => [item.id, item]));
    return COMPLIANCE_ITEMS.map((item) => {
      const entry = map.get(item.id);
      return {
        ...item,
        status: entry?.status ?? "not-started",
        note: entry?.note ?? "",
        updatedAt: entry?.updatedAt,
      };
    });
  }, [state.items]);

  const updateStatus = (id: string, status: ComplianceStatus) => {
    const updatedItems = entries.map((entry) =>
      entry.id === id
        ? {
            id: entry.id,
            status,
            note: entry.note,
            updatedAt: new Date().toISOString(),
          }
        : {
            id: entry.id,
            status: entry.status,
            note: entry.note,
            updatedAt: entry.updatedAt,
          }
    );
    onChange({
      version: state.version,
      items: updatedItems,
      lastUpdated: new Date().toISOString(),
    });
  };

  const updateNote = (id: string, note: string) => {
    const updatedItems = entries.map((entry) =>
      entry.id === id
        ? {
            id: entry.id,
            status: entry.status,
            note,
            updatedAt: new Date().toISOString(),
          }
        : {
            id: entry.id,
            status: entry.status,
            note: entry.note,
            updatedAt: entry.updatedAt,
          }
    );
    onChange({
      version: state.version,
      items: updatedItems,
      lastUpdated: new Date().toISOString(),
    });
  };

  const handleExport = () => {
    const data = serializeComplianceChecklist({
      version: state.version,
      items: entries.map((entry) => ({
        id: entry.id,
        status: entry.status,
        note: entry.note,
        updatedAt: entry.updatedAt,
      })),
      lastUpdated: new Date().toISOString(),
    });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-checklist.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const parsed = deserializeComplianceChecklist(text);
    if (!parsed) {
      window.alert("Invalid compliance checklist file.");
      return;
    }
    onChange({
      version: parsed.version,
      items: parsed.items.map((item) => ({
        ...item,
        updatedAt: item.updatedAt ?? new Date().toISOString(),
      })),
      lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
    });
  };

  return (
    <div className="px-6 py-6 space-y-6 text-ubt-grey">
      <section aria-labelledby="compliance-overview">
        <h2 id="compliance-overview" className="text-xl font-semibold text-white mb-2">
          Compliance Overview
        </h2>
        <p className="text-sm leading-6">
          Track the operational status of key governance controls. Each item links to documentation so teams can confirm scope
          and responsibilities before marking a status. Export the checklist for audit trails or import updates from another
          workspace.
        </p>
      </section>

      <section aria-labelledby="compliance-actions" className="bg-ub-dark rounded-lg border border-gray-900 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 id="compliance-actions" className="text-lg font-semibold text-white">
              Checklist actions
            </h3>
            <p className="text-xs text-ubt-grey/80">
              Export creates a JSON snapshot. Import merges stored statuses with new checklist items.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 rounded bg-ub-orange text-white hover:bg-ub-orange/90"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded bg-ub-orange text-white hover:bg-ub-orange/90"
            >
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="application/json"
              aria-label="Import compliance checklist JSON"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file);
                }
                event.target.value = "";
              }}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="compliance-checklist-table" className="space-y-4">
        <h3 id="compliance-checklist-table" className="text-lg font-semibold text-white">
          Control checklist
        </h3>
        <div className="space-y-4">
          {entries.map((entry) => {
            const statusId = `${entry.id}-status`;
            const notesId = `${entry.id}-notes`;
            return (
              <article
                key={entry.id}
                className="bg-ub-dark border border-gray-900 rounded-lg p-4 focus-within:ring-2 focus-within:ring-ub-orange"
              >
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-base font-semibold text-white">{entry.title}</h4>
                    <p className="text-xs text-ubt-grey/80">Owned by {entry.owner}</p>
                  </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClassNames[entry.status]}`}
                  aria-live="polite"
                >
                  {statusLabels[entry.status]}
                </span>
              </header>
              <p className="text-sm leading-6 mb-3">{entry.description}</p>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col md:w-1/2 text-sm">
                  <label
                    htmlFor={statusId}
                    className="text-xs uppercase tracking-wide text-ubt-grey/80"
                  >
                    Status
                  </label>
                  <select
                    id={statusId}
                    value={entry.status}
                    onChange={(event) => updateStatus(entry.id, event.target.value as ComplianceStatus)}
                    className="mt-1 bg-ub-cool-grey text-white border border-gray-700 rounded px-2 py-1"
                    aria-label={`${entry.title} status`}
                  >
                    {COMPLIANCE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col md:w-1/2 text-sm">
                  <label
                    htmlFor={notesId}
                    className="text-xs uppercase tracking-wide text-ubt-grey/80"
                  >
                    Notes
                  </label>
                  <textarea
                    id={notesId}
                    value={entry.note ?? ""}
                    onChange={(event) => updateNote(entry.id, event.target.value)}
                    className="mt-1 bg-ub-cool-grey text-white border border-gray-700 rounded px-2 py-2 min-h-[80px]"
                    placeholder="Status context, blockers, or next steps"
                    aria-label={`${entry.title} notes`}
                  />
                </div>
              </div>
              <footer className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-ubt-grey/70">
                <a
                  href={entry.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ub-orange hover:underline"
                >
                  View documentation
                </a>
                <span>
                  {entry.updatedAt
                    ? `Last updated ${new Date(entry.updatedAt).toLocaleString()}`
                    : 'Not reviewed yet'}
                </span>
              </footer>
            </article>
          );
          })}
        </div>
      </section>
    </div>
  );
};

export default ComplianceChecklist;

