import { diffWords } from 'diff';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';
import TerminalOutput from './TerminalOutput';

const fieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  required: z.boolean().optional().default(false),
  placeholder: z.string().optional(),
  example: z.string().optional(),
  defaultValue: z.string().optional(),
});

type FieldDefinition = z.infer<typeof fieldSchema>;

interface BuilderProps {
  doc: string;
  build: (params: Record<string, string>) => string;
  fields: FieldDefinition[];
}

export default function CommandBuilder({ doc, build, fields }: BuilderProps) {
  const parsedFields = useMemo(() => fieldSchema.array().parse(fields), [fields]);

  const baseParams = useMemo(() => {
    return parsedFields.reduce<Record<string, string>>((acc, field) => {
      if (typeof field.defaultValue === 'string') {
        acc[field.key] = field.defaultValue;
      }
      return acc;
    }, {});
  }, [parsedFields]);

  const [params, setParams] = useState<Record<string, string>>(() => ({ ...baseParams }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setParams({ ...baseParams });
    setErrors({});
  }, [baseParams]);

  const update = (key: string, field: FieldDefinition) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setParams((prev) => ({ ...prev, [key]: value }));
    if (field.required) {
      setErrors((prev) => {
        if (value.trim()) {
          const { [key]: _removed, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    parsedFields.forEach((field) => {
      if (field.required && !params[field.key]?.trim()) {
        nextErrors[field.key] = `${field.label} is required.`;
      }
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = parsedFields.find((field) => nextErrors[field.key]);
      if (firstInvalid) {
        inputRefs.current[firstInvalid.key]?.focus();
      }
      return false;
    }

    return true;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    validate();
  };

  const command = useMemo(() => build(params), [build, params]);
  const baseCommand = useMemo(() => build(baseParams), [build, baseParams]);
  const diff = useMemo(() => diffWords(baseCommand, command), [baseCommand, command]);

  return (
    <form
      className="text-xs space-y-3"
      onSubmit={handleSubmit}
      aria-label="command builder"
    >
      <p className="mb-1 text-slate-200" aria-label="inline docs">
        {doc}
      </p>
      <div className="space-y-2">
        {parsedFields.map((field) => {
          const value = params[field.key] ?? '';
          const isRequiredBlank = field.required && !value.trim();
          const errorMessage = errors[field.key];
          const hasError = Boolean(errorMessage);
          const showInvalid = hasError || isRequiredBlank;
          const borderClass = showInvalid ? 'border-red-500 focus:border-red-400' : 'border-slate-500 focus:border-sky-400';
          const exampleClasses = showInvalid ? 'text-red-300' : 'text-slate-300';
          const helperText = field.required ? 'Required' : 'Optional';

          return (
            <div key={field.key}>
              <label className="mb-1 block font-semibold text-slate-100" htmlFor={`builder-${field.key}`}>
                {field.label}
                {field.required && <span className="ml-1 text-red-400" aria-hidden="true">*</span>}
              </label>
              <input
                id={`builder-${field.key}`}
                ref={(node) => {
                  inputRefs.current[field.key] = node;
                }}
                aria-label={field.label.toLowerCase()}
                aria-invalid={showInvalid ? 'true' : 'false'}
                className={`w-full rounded border bg-white p-1 text-black focus:outline-none ${borderClass}`}
                placeholder={field.placeholder}
                value={value}
                onChange={update(field.key, field)}
              />
              <div className={`mt-1 text-[11px] ${exampleClasses}`}>
                <span className="font-semibold">{helperText}.</span>{' '}
                {field.example ? (
                  <span>
                    Example: <code className="font-mono text-[10px]">{field.example}</code>
                  </span>
                ) : (
                  <span>Provide a value to customize the command.</span>
                )}
                {errorMessage && (
                  <span className="mt-1 block text-red-200">{errorMessage}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="submit"
        className="rounded bg-sky-600 px-3 py-1 font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300"
      >
        Build Command
      </button>
      <div className="space-y-2">
        <div>
          <h3 className="mb-1 font-semibold uppercase tracking-wide text-slate-300">Command Preview</h3>
          <TerminalOutput text={command} ariaLabel="command output" />
        </div>
        <div>
          <h3 className="mb-1 font-semibold uppercase tracking-wide text-slate-300">Live Diff</h3>
          <pre className="whitespace-pre-wrap rounded border border-slate-600 bg-slate-900 p-2 font-mono text-[11px] text-slate-100" aria-label="command diff">
            {diff.map((part, index) => {
              if (part.added) {
                return (
                  <span key={`added-${index}`} className="bg-green-700/60 text-green-100">
                    {part.value}
                  </span>
                );
              }
              if (part.removed) {
                return (
                  <span key={`removed-${index}`} className="bg-red-700/60 text-red-100 line-through">
                    {part.value}
                  </span>
                );
              }
              return (
                <span key={`context-${index}`} className="text-slate-100">
                  {part.value}
                </span>
              );
            })}
          </pre>
        </div>
      </div>
    </form>
  );
}

