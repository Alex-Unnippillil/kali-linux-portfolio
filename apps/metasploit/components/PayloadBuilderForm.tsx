'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ZodIssue } from 'zod';
import {
  buildPayloadScript,
  getPayloadDefinition,
  payloadDefinitions,
  payloadSelectionSchema,
  type PayloadDefinition,
  type PayloadSelection,
} from '../../../components/apps/metasploit/payloads';

interface PayloadBuilderFormProps {
  onCopy?: (result: { success: boolean; payload: string }) => void;
}

type OptionErrorMap = Record<string, string>;

interface FormErrors {
  type?: string;
  architecture?: string;
  encoder?: string;
  options?: OptionErrorMap;
}

const buildInitialState = (definition: PayloadDefinition): PayloadSelection => ({
  type: definition.id,
  architecture: definition.architectures[0],
  encoder: definition.encoders[0],
  options: definition.options.reduce<Record<string, string>>((acc, option) => {
    acc[option.name] = option.defaultValue ?? '';
    return acc;
  }, {}),
});

const toErrorMap = (issues: ZodIssue[]): FormErrors => {
  const errors: FormErrors = {};
  issues.forEach((issue) => {
    const [first, second] = issue.path;
    if (first === 'options' && typeof second === 'string') {
      if (!errors.options) errors.options = {};
      errors.options[second] = issue.message;
    } else if (typeof first === 'string') {
      errors[first as keyof FormErrors] = issue.message;
    }
  });
  return errors;
};

const PayloadBuilderForm: React.FC<PayloadBuilderFormProps> = ({ onCopy }) => {
  const defaultDefinition = payloadDefinitions[0];
  const [formState, setFormState] = useState<PayloadSelection>(() =>
    buildInitialState(defaultDefinition),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  const selectedDefinition = useMemo(
    () => getPayloadDefinition(formState.type) ?? defaultDefinition,
    [formState.type, defaultDefinition],
  );

  useEffect(() => {
    const result = payloadSelectionSchema.safeParse(formState);
    if (result.success) {
      setErrors({});
      setIsValid(true);
    } else {
      setErrors(toErrorMap(result.error.issues));
      setIsValid(false);
    }
  }, [formState]);

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value;
    const definition = getPayloadDefinition(nextType);
    if (!definition) {
      setFormState((prev) => ({ ...prev, type: nextType }));
      return;
    }

    setFormState((prev) => {
      const nextArchitecture = definition.architectures.includes(prev.architecture)
        ? prev.architecture
        : definition.architectures[0];
      const nextEncoder = definition.encoders.includes(prev.encoder)
        ? prev.encoder
        : definition.encoders[0];

      const optionState = definition.options.reduce<Record<string, string>>((acc, option) => {
        const prior = prev.options?.[option.name];
        acc[option.name] = prior !== undefined ? prior : option.defaultValue ?? '';
        return acc;
      }, {});

      return {
        type: definition.id,
        architecture: nextArchitecture,
        encoder: nextEncoder,
        options: optionState,
      };
    });
  };

  const handleArchitectureChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, architecture: event.target.value }));
  };

  const handleEncoderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, encoder: event.target.value }));
  };

  const handleOptionChange = (name: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        [name]: value,
      },
    }));
  };

  const preview = useMemo(() => {
    return JSON.stringify(
      {
        payload: formState.type,
        architecture: formState.architecture,
        encoder: formState.encoder,
        options: formState.options,
      },
      null,
      2,
    );
  }, [formState]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = payloadSelectionSchema.safeParse(formState);
    if (!result.success) {
      setErrors(toErrorMap(result.error.issues));
      setIsValid(false);
      setStatus({ success: false, message: 'Resolve validation errors before generating.' });
      return;
    }

    const payloadScript = buildPayloadScript(result.data);

    setIsSubmitting(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payloadScript);
        setStatus({ success: true, message: 'Payload copied to clipboard.' });
        onCopy?.({ success: true, payload: payloadScript });
      } else {
        setStatus({ success: false, message: 'Clipboard API is not available.' });
        onCopy?.({ success: false, payload: payloadScript });
      }
    } catch (error) {
      setStatus({ success: false, message: 'Failed to copy payload to clipboard.' });
      onCopy?.({ success: false, payload: payloadScript });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={handleSubmit} data-testid="payload-builder-form">
        <div>
          <label className="block text-sm font-medium text-gray-200" htmlFor="payload-type">
            Payload Type
          </label>
          <select
            id="payload-type"
            className="mt-1 w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm text-gray-100"
            value={formState.type}
            onChange={handleTypeChange}
          >
            {payloadDefinitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.name}
              </option>
            ))}
          </select>
          {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type}</p>}
          <p className="mt-1 text-xs text-gray-400">{selectedDefinition.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-gray-200"
              htmlFor="payload-architecture"
            >
              Architecture
            </label>
            <select
              id="payload-architecture"
              className="mt-1 w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm text-gray-100"
              value={formState.architecture}
              onChange={handleArchitectureChange}
            >
              {selectedDefinition.architectures.map((arch) => (
                <option key={arch} value={arch}>
                  {arch}
                </option>
              ))}
            </select>
            {errors.architecture && (
              <p className="mt-1 text-xs text-red-400">{errors.architecture}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200" htmlFor="payload-encoder">
              Encoder
            </label>
            <select
              id="payload-encoder"
              className="mt-1 w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm text-gray-100"
              value={formState.encoder}
              onChange={handleEncoderChange}
            >
              {selectedDefinition.encoders.map((enc) => (
                <option key={enc} value={enc}>
                  {enc}
                </option>
              ))}
            </select>
            {errors.encoder && <p className="mt-1 text-xs text-red-400">{errors.encoder}</p>}
          </div>
        </div>

        <div className="space-y-3">
          {selectedDefinition.options.map((option) => {
            const fieldId = `payload-option-${option.name.toLowerCase()}`;
            const labelId = `${fieldId}-label`;
            return (
              <div key={option.name}>
                <label
                  id={labelId}
                  className="block text-sm font-medium text-gray-200"
                  htmlFor={fieldId}
                >
                  {option.label}
                </label>
                <input
                  id={fieldId}
                  name={option.name}
                  type="text"
                  className="mt-1 w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm text-gray-100"
                  placeholder={option.placeholder}
                  value={formState.options?.[option.name] ?? ''}
                  aria-labelledby={labelId}
                  onChange={(event) => handleOptionChange(option.name, event.target.value)}
                />
                {option.description && (
                  <p className="mt-1 text-xs text-gray-400">{option.description}</p>
                )}
                {errors.options?.[option.name] && (
                  <p className="mt-1 text-xs text-red-400">{errors.options[option.name]}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-blue-600/50"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Copying…' : 'Generate Payload'}
          </button>
          {status && (
            <p
              className={`text-sm ${status.success ? 'text-green-400' : 'text-red-400'}`}
              role="status"
              aria-live="polite"
            >
              {status.message}
            </p>
          )}
        </div>
      </form>

      <div className="rounded border border-gray-700 bg-black/70 p-3 text-xs text-green-300">
        <div className="mb-2 text-sm font-semibold text-gray-200">Payload Preview</div>
        <pre data-testid="payload-preview" className="whitespace-pre-wrap break-words">{preview}</pre>
      </div>
    </div>
  );
};

export default PayloadBuilderForm;
