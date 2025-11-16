"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';

export type PdfFormValue = string | boolean;

interface PdfFormFieldBase {
  id: string;
  /**
   * Optional custom name used for grouping and persistence.
   * Falls back to `id` when omitted.
   */
  name?: string;
  label: string;
  description?: string;
  readOnly?: boolean;
  required?: boolean;
}

export interface PdfTextField extends PdfFormFieldBase {
  type: 'text';
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
}

export interface PdfCheckboxField extends PdfFormFieldBase {
  type: 'checkbox';
  defaultChecked?: boolean;
}

export interface PdfRadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface PdfRadioField extends PdfFormFieldBase {
  type: 'radio';
  options: PdfRadioOption[];
  defaultValue?: string;
}

export type PdfFormField = PdfTextField | PdfCheckboxField | PdfRadioField;

export type PdfFormValueMap = Record<string, PdfFormValue>;

export interface PdfFormsProps {
  /**
   * Stable identifier for the document. Used as the persistence key.
   */
  documentId: string;
  /**
   * List of interactive fields extracted from the PDF.
   */
  fields: PdfFormField[];
  /**
   * Attempt to write a filled copy of the PDF. Should throw when unsupported.
   */
  onSaveDocument?: (values: PdfFormValueMap) => Promise<void> | void;
  /**
   * Optional callback invoked when exporting form data. Defaults to downloading JSON.
   */
  onExportData?: (values: PdfFormValueMap) => void;
  className?: string;
}

const FORM_STORAGE_PREFIX = 'pdf-form:';

type FieldWithKey = {
  field: PdfFormField;
  key: string;
};

const isFormValueMap = (value: unknown): value is PdfFormValueMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (entry) => typeof entry === 'string' || typeof entry === 'boolean',
  );
};

const getFieldKey = (field: PdfFormField) => field.name ?? field.id;

const shallowEqual = (a: PdfFormValueMap, b: PdfFormValueMap) => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
};

const normaliseFileName = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pdf-form';

const buildDefaults = (fieldsWithKeys: FieldWithKey[]): PdfFormValueMap => {
  const defaults: PdfFormValueMap = {};
  fieldsWithKeys.forEach(({ field, key }) => {
    switch (field.type) {
      case 'text':
        defaults[key] = field.defaultValue ?? '';
        break;
      case 'checkbox':
        defaults[key] = field.defaultChecked ?? false;
        break;
      case 'radio': {
        const fallbackOption =
          field.options.find((option) => option.value.length > 0) ??
          field.options[0];
        const preferred =
          field.defaultValue ?? fallbackOption?.value ?? '';
        defaults[key] = preferred;
        break;
      }
      default:
        defaults[key] = '';
    }
  });
  return defaults;
};

const downloadJson = (fileName: string, payload: unknown) => {
  if (typeof window === 'undefined') {
    throw new Error('File downloads are only available in the browser context.');
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const PdfForms: React.FC<PdfFormsProps> = ({
  documentId,
  fields,
  onSaveDocument,
  onExportData,
  className,
}) => {
  const instanceId = useId();
  const storageKey = useMemo(
    () => `${FORM_STORAGE_PREFIX}${documentId}`,
    [documentId],
  );

  const fieldsWithKeys = useMemo<FieldWithKey[]>(
    () => fields.map((field) => ({ field, key: getFieldKey(field) })),
    [fields],
  );

  const defaults = useMemo(
    () => buildDefaults(fieldsWithKeys),
    [fieldsWithKeys],
  );

  const loadFromStorage = useCallback((): PdfFormValueMap => {
    const base: PdfFormValueMap = { ...defaults };
    if (typeof window === 'undefined') return base;
    try {
      const storedRaw = window.localStorage.getItem(storageKey);
      if (!storedRaw) return base;
      const parsed = JSON.parse(storedRaw);
      if (!isFormValueMap(parsed)) return base;
      fieldsWithKeys.forEach(({ key }) => {
        if (key in parsed) {
          const candidate = parsed[key];
          if (typeof candidate === 'string' || typeof candidate === 'boolean') {
            base[key] = candidate;
          }
        }
      });
    } catch {
      // ignore parse errors and fall back to defaults
    }
    return base;
  }, [defaults, fieldsWithKeys, storageKey]);

  const [values, setValues] = useState<PdfFormValueMap>(() => loadFromStorage());

  useEffect(() => {
    setValues((prev) => {
      const next = loadFromStorage();
      return shallowEqual(prev, next) ? prev : next;
    });
  }, [loadFromStorage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // ignore write errors to preserve UX
    }
  }, [storageKey, values]);

  const [status, setStatus] = useState<
    'idle' | 'saving' | 'saved' | 'exported' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateValue = useCallback(
    (key: string, value: PdfFormValue) => {
      setValues((prev) => {
        if (prev[key] === value) return prev;
        return { ...prev, [key]: value };
      });
      setStatus('idle');
      setErrorMessage(null);
    },
    [],
  );

  const normalizedValues = useMemo(() => {
    const map: PdfFormValueMap = {};
    fieldsWithKeys.forEach(({ key }) => {
      const candidate = values[key];
      if (typeof candidate === 'string' || typeof candidate === 'boolean') {
        map[key] = candidate;
      } else {
        map[key] = defaults[key];
      }
    });
    return map;
  }, [defaults, fieldsWithKeys, values]);

  const hasChanges = useMemo(
    () =>
      fieldsWithKeys.some(({ key }) => normalizedValues[key] !== defaults[key]),
    [defaults, fieldsWithKeys, normalizedValues],
  );

  const exportData = useCallback(
    (payload: PdfFormValueMap) => {
      if (onExportData) {
        onExportData(payload);
        return;
      }
      const safeName = normaliseFileName(documentId);
      downloadJson(`${safeName}-data.json`, {
        documentId,
        values: payload,
      });
    },
    [documentId, onExportData],
  );

  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();
      const payload = { ...normalizedValues };
      setStatus('saving');
      setErrorMessage(null);
      try {
        if (onSaveDocument) {
          await onSaveDocument(payload);
          setStatus('saved');
        } else {
          exportData(payload);
          setStatus('exported');
        }
      } catch (error) {
        console.error('Failed to save PDF form data', error);
        if (onSaveDocument) {
          try {
            exportData(payload);
            setStatus('exported');
            setErrorMessage(
              'Saving the filled copy is unavailable. Exported the form data instead.',
            );
          } catch (exportError) {
            console.error('Failed to export PDF form data', exportError);
            setStatus('error');
            setErrorMessage('Unable to save or export form data.');
          }
        } else {
          setStatus('error');
          setErrorMessage('Unable to export form data.');
        }
      }
    },
    [exportData, normalizedValues, onSaveDocument],
  );

  const handleExport = useCallback(() => {
    try {
      exportData({ ...normalizedValues });
      setStatus('exported');
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to export PDF form data', error);
      setStatus('error');
      setErrorMessage('Unable to export form data.');
    }
  }, [exportData, normalizedValues]);

  const handleReset = useCallback(() => {
    setValues({ ...defaults });
    setStatus('idle');
    setErrorMessage(null);
  }, [defaults]);

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'saving':
        return 'Saving your changes…';
      case 'saved':
        return 'A filled copy has been saved.';
      case 'exported':
        return 'Form data exported successfully.';
      case 'error':
        return errorMessage ?? 'An unexpected error occurred.';
      default:
        return hasChanges
          ? 'Changes are saved locally for this document.'
          : 'Fill the fields to get started.';
    }
  }, [errorMessage, hasChanges, status]);

  return (
    <form
      onSubmit={handleSubmit}
      className={className ?? 'flex flex-col gap-6'}
      aria-label="PDF form fields"
    >
      {fieldsWithKeys.map(({ field, key }) => {
        const baseId = `${instanceId}-${key}`;
        const descriptionId = field.description ? `${baseId}-desc` : undefined;
        const labelId = `${baseId}-label`;

        if (field.type === 'text') {
          const value = normalizedValues[key];
          return (
            <div key={key} className="flex flex-col gap-2">
              <label
                id={labelId}
                htmlFor={baseId}
                className="font-medium text-sm text-neutral-200"
              >
                {field.label}
                {field.required && (
                  <span className="ml-1 text-red-400" aria-hidden>
                    *
                  </span>
                )}
              </label>
              {field.description && (
                <p id={descriptionId} className="text-xs text-neutral-400">
                  {field.description}
                </p>
              )}
              <input
                id={baseId}
                name={key}
                type="text"
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => updateValue(key, event.target.value)}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                required={field.required}
                readOnly={field.readOnly}
                aria-describedby={descriptionId}
                aria-labelledby={labelId}
                className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>
          );
        }

        if (field.type === 'checkbox') {
          const checked = Boolean(normalizedValues[key]);
          return (
            <label
              key={key}
              htmlFor={baseId}
              className="flex cursor-pointer select-none items-start gap-3"
            >
              <span className="pt-1">
                <input
                  id={baseId}
                  name={key}
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => updateValue(key, event.target.checked)}
                  disabled={field.readOnly}
                  aria-describedby={descriptionId}
                  aria-labelledby={labelId}
                  className="h-4 w-4 rounded border border-neutral-700 bg-neutral-900 text-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                />
              </span>
              <span className="flex flex-col">
                <span id={labelId} className="text-sm text-neutral-200">
                  {field.label}
                </span>
                {field.description && (
                  <span id={descriptionId} className="text-xs text-neutral-400">
                    {field.description}
                  </span>
                )}
              </span>
            </label>
          );
        }

        if (field.type === 'radio') {
          const currentValue = normalizedValues[key];
          return (
            <fieldset key={key} className="flex flex-col gap-2">
              <legend
                id={`${baseId}-legend`}
                className="font-medium text-sm text-neutral-200"
              >
                {field.label}
                {field.required && (
                  <span className="ml-1 text-red-400" aria-hidden>
                    *
                  </span>
                )}
              </legend>
              {field.description && (
                <p id={descriptionId} className="text-xs text-neutral-400">
                  {field.description}
                </p>
              )}
              <div aria-describedby={descriptionId}>
                {field.options.map((option, index) => {
                  const optionId = `${baseId}-${index}`;
                  const optionLabelId = `${optionId}-label`;
                  return (
                    <label
                      key={option.value}
                      htmlFor={optionId}
                      className="mb-1 flex cursor-pointer items-center gap-3 text-sm text-neutral-200 last:mb-0"
                    >
                      <input
                        id={optionId}
                        type="radio"
                        name={key}
                        value={option.value}
                        checked={currentValue === option.value}
                        onChange={() => updateValue(key, option.value)}
                        required={field.required && index === 0}
                        disabled={field.readOnly}
                        aria-labelledby={optionLabelId}
                        className="h-4 w-4 border border-neutral-700 text-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      />
                      <span className="flex flex-col">
                        <span id={optionLabelId}>{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-neutral-400">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        }

        return null;
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded bg-sky-500 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-70"
          disabled={status === 'saving'}
        >
          {onSaveDocument
            ? status === 'saving'
              ? 'Saving…'
              : 'Save filled copy'
            : 'Export form data'}
        </button>
        {(onSaveDocument || onExportData) && (
          <button
            type="button"
            onClick={handleExport}
            className="rounded border border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-200 hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Export data
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          Reset form
        </button>
      </div>

      <div
        role={status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className={`text-xs ${
          status === 'error' ? 'text-red-400' : 'text-neutral-400'
        }`}
      >
        {statusMessage}
      </div>
    </form>
  );
};

export default PdfForms;
