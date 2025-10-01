import React from 'react';
import { ToolTemplate } from './TemplatePicker';
import {
  TemplateFieldDiff,
  formatTemplateValue,
} from '../../utils/templateUtils';

interface TemplateDiffPreviewProps {
  template: ToolTemplate;
  diffs: TemplateFieldDiff[];
  onToggle: (field: string, apply: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  fieldLabels?: Record<string, string>;
}

const TemplateDiffPreview: React.FC<TemplateDiffPreviewProps> = ({
  template,
  diffs,
  onToggle,
  onApply,
  onCancel,
  fieldLabels = {},
}) => {
  const changedDiffs = diffs.filter((diff) => diff.changed);

  return (
    <section
      className="mb-4 border border-ub-yellow/60 bg-black/60 rounded p-4"
      aria-label={`Preview changes for ${template.name}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h2 className="text-base font-semibold text-white">{template.name}</h2>
          <p className="text-sm text-gray-300">{template.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 rounded bg-gray-700 text-sm text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-3 py-1 rounded bg-ub-yellow text-black font-semibold"
          >
            Apply selected fields
          </button>
        </div>
      </div>

      {changedDiffs.length === 0 ? (
        <p className="text-sm text-gray-300">
          All template values already match your current configuration.
        </p>
      ) : (
        <div className="space-y-3">
          {changedDiffs.map((diff) => {
            const label = fieldLabels[diff.key] || diff.key;
            return (
              <div
                key={diff.key}
                className="border border-gray-700 rounded p-3 bg-gray-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-xs text-gray-300">
                      <div>
                        <p className="uppercase text-gray-500 tracking-wide mb-1">
                          Current
                        </p>
                        <pre className="whitespace-pre-wrap break-words bg-black/40 p-2 rounded border border-gray-800">
                          {formatTemplateValue(diff.currentValue)}
                        </pre>
                      </div>
                      <div>
                        <p className="uppercase text-gray-500 tracking-wide mb-1">
                          Template
                        </p>
                        <pre className="whitespace-pre-wrap break-words bg-black/40 p-2 rounded border border-gray-800">
                          {formatTemplateValue(diff.templateValue)}
                        </pre>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    <label className="inline-flex items-center gap-2 text-xs text-gray-200">
                      <input
                        type="checkbox"
                        checked={diff.apply}
                        onChange={(event) => onToggle(diff.key, event.target.checked)}
                        aria-label={`Apply template value for ${label}`}
                      />
                      Apply
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default TemplateDiffPreview;
