import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { normalizeAnnotations } from "./utils";

const AnnotationManager = ({
  annotations,
  disasm,
  onUpdate,
  onResolve,
  onClear,
  onClearAll,
  onClose,
}) => {
  const entries = useMemo(() => {
    const normalized = normalizeAnnotations(annotations || {});
    const instructions = new Map(
      (disasm || []).map((line) => [line.addr, line.text || ""]),
    );
    return Object.entries(normalized)
      .map(([addr, value]) => ({
        addr,
        label: value.label || "",
        comment: value.comment || "",
        text: instructions.get(addr) || "",
      }))
      .sort((a, b) => {
        const parse = (value) => {
          if (typeof value !== "string") return Number.MAX_SAFE_INTEGER;
          const normalizedAddr = value.toLowerCase().startsWith("0x")
            ? value
            : `0x${value}`;
          const parsed = Number.parseInt(normalizedAddr, 16);
          return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
        };
        return parse(a.addr) - parse(b.addr);
      });
  }, [annotations, disasm]);

  const conflicts = useMemo(() => {
    const byLabel = new Map();
    entries.forEach((entry) => {
      if (!entry.label) return;
      if (!byLabel.has(entry.label)) byLabel.set(entry.label, []);
      byLabel.get(entry.label).push(entry.addr);
    });
    return Array.from(byLabel.entries()).filter(([, list]) => list.length > 1);
  }, [entries]);

  const handleBlur = (addr, field) => (event) => {
    const value = event.target.value;
    onUpdate(addr, { [field]: value });
  };

  const handleKeyDown = (addr, field) => (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onUpdate(addr, { [field]: event.target.value });
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.currentTarget.blur();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[80vh] w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 overflow-auto rounded shadow-lg"
        style={{
          backgroundColor: "var(--r2-surface)",
          border: "1px solid var(--r2-border)",
          color: "var(--r2-text)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--r2-border)" }}>
          <h2 className="text-lg font-semibold">Annotation Manager</h2>
          <div className="flex gap-2">
            <button
              onClick={onClearAll}
              className="px-3 py-1 rounded text-sm"
              style={{
                backgroundColor: "var(--r2-surface)",
                border: "1px solid var(--r2-border)",
              }}
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded text-sm"
              style={{
                backgroundColor: "var(--r2-surface)",
                border: "1px solid var(--r2-border)",
              }}
            >
              Close
            </button>
          </div>
        </div>
        {conflicts.length > 0 && (
          <div className="px-4 py-3 border-b text-sm" style={{ borderColor: "var(--r2-border)" }}>
            <h3 className="font-medium mb-2">Conflicts</h3>
            <ul className="space-y-2">
              {conflicts.map(([label, addresses]) => (
                <li key={label} className="flex items-center gap-3 flex-wrap">
                  <span>
                    <span className="font-semibold">{label}</span> used at {addresses.join(", ")}
                  </span>
                  <button
                    onClick={() => onResolve(label)}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: "var(--r2-surface)",
                      border: "1px solid var(--r2-border)",
                    }}
                  >
                    Auto resolve
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="px-4 py-3">
          {entries.length === 0 ? (
            <p className="text-sm opacity-80">No annotations yet. Add a rename or comment from the disassembly view.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-2">Address</th>
                  <th className="py-2 pr-2">Instruction</th>
                  <th className="py-2 pr-2">Label</th>
                  <th className="py-2 pr-2">Comment</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.addr} className="align-top">
                    <td className="py-2 pr-2 font-mono whitespace-nowrap">{entry.addr}</td>
                    <td className="py-2 pr-2">{entry.text}</td>
                    <td className="py-2 pr-2 w-40">
                      <input
                        defaultValue={entry.label}
                        onBlur={handleBlur(entry.addr, "label")}
                        onKeyDown={handleKeyDown(entry.addr, "label")}
                        className="w-full px-2 py-1 rounded"
                        style={{
                          backgroundColor: "var(--r2-bg)",
                          border: "1px solid var(--r2-border)",
                          color: "var(--r2-text)",
                        }}
                        aria-label={`Annotation label for ${entry.addr}`}
                      />
                    </td>
                    <td className="py-2 pr-2 w-64">
                      <textarea
                        defaultValue={entry.comment}
                        onBlur={handleBlur(entry.addr, "comment")}
                        onKeyDown={handleKeyDown(entry.addr, "comment")}
                        className="w-full px-2 py-1 rounded"
                        rows={2}
                        style={{
                          backgroundColor: "var(--r2-bg)",
                          border: "1px solid var(--r2-border)",
                          color: "var(--r2-text)",
                        }}
                        aria-label={`Annotation comment for ${entry.addr}`}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => onClear(entry.addr)}
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: "var(--r2-surface)",
                          border: "1px solid var(--r2-border)",
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

AnnotationManager.propTypes = {
  annotations: PropTypes.object.isRequired,
  disasm: PropTypes.array.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onResolve: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AnnotationManager;
