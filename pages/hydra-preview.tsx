import React, { useMemo, useState } from 'react';
import { z } from 'zod';

import FormError from '../components/ui/FormError';
import { useI18n } from '../lib/i18n';
import { createFormValidator, type FieldErrors } from '../lib/validation/form-validator';

const protocolValues = ['ssh', 'ftp', 'http', 'smtp'] as const;

const hydraSchema = z.object({
  target: z.string().trim().min(1).max(255),
  protocol: z.enum(protocolValues),
  wordlist: z.string().trim().min(1).max(255),
});

type HydraForm = z.infer<typeof hydraSchema>;

const HydraPreview: React.FC = () => {
  const { t } = useI18n();

  const validator = useMemo(
    () =>
      createFormValidator<HydraForm>({
        schema: hydraSchema,
        t,
        fieldLabels: {
          target: 'forms.hydra.fields.target',
          protocol: 'forms.hydra.fields.protocol',
          wordlist: 'forms.hydra.fields.wordlist',
        },
      }),
    [t],
  );

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<HydraForm>({
    target: '',
    protocol: protocolValues[0],
    wordlist: '',
  });
  const [errors, setErrors] = useState<FieldErrors<HydraForm>>({});

  const goToNextStep = () => {
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = async () => {
    const order: Array<keyof HydraForm> = ['target', 'protocol', 'wordlist'];
    const field = order[step];

    let draft = form;

    if (field) {
      const { errors: fieldErrors, value } = await validator.validateField(
        field,
        form[field],
        form,
      );
      if (fieldErrors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: fieldErrors[field],
        }));
        return;
      }
      if (value !== undefined) {
        draft = {
          ...draft,
          [field]: value,
        } as HydraForm;
      }
      setErrors((prev) => {
        if (!(field in prev)) return prev;
        const nextErrors = { ...prev } as FieldErrors<HydraForm>;
        delete nextErrors[field];
        return nextErrors;
      });
    }

    if (step === order.length - 1) {
      const result = await validator.validate(draft);
      if (!result.data) {
        setErrors(result.errors);
        return;
      }
      draft = result.data;
    }

    setForm(draft);
    goToNextStep();
  };

  const command = `hydra -P ${form.wordlist.trim()} ${form.protocol}://${form.target.trim()}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-md">
        {step === 0 && (
          <div>
            <label htmlFor="target" className="mb-2 block text-sm font-medium">
              Target Host
            </label>
            <input
              id="target"
              className="mb-2 w-full rounded border p-2"
              type="text"
              value={form.target}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  target: e.target.value,
                }))
              }
              placeholder="example.com or 192.168.1.1"
              aria-invalid={!!errors.target}
              aria-describedby={errors.target ? 'hydra-target-error' : undefined}
            />
            {errors.target && (
              <FormError id="hydra-target-error" className="mt-2">
                {errors.target}
              </FormError>
            )}
          </div>
        )}
        {step === 1 && (
          <div>
            <label htmlFor="protocol" className="mb-2 block text-sm font-medium">
              Protocol
            </label>
            <select
              id="protocol"
              className="mb-2 w-full rounded border p-2"
              value={form.protocol}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  protocol: e.target.value as HydraForm['protocol'],
                }))
              }
              aria-invalid={!!errors.protocol}
              aria-describedby={errors.protocol ? 'hydra-protocol-error' : undefined}
            >
              {protocolValues.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {errors.protocol && (
              <FormError id="hydra-protocol-error" className="mt-2">
                {errors.protocol}
              </FormError>
            )}
          </div>
        )}
        {step === 2 && (
          <div>
            <label htmlFor="wordlist" className="mb-2 block text-sm font-medium">
              Wordlist Path
            </label>
            <input
              id="wordlist"
              className="mb-2 w-full rounded border p-2"
              type="text"
              value={form.wordlist}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  wordlist: e.target.value,
                }))
              }
              placeholder="/usr/share/wordlists/rockyou.txt"
              aria-invalid={!!errors.wordlist}
              aria-describedby={errors.wordlist ? 'hydra-wordlist-error' : undefined}
            />
            {errors.wordlist && (
              <FormError id="hydra-wordlist-error" className="mt-2">
                {errors.wordlist}
              </FormError>
            )}
          </div>
        )}
        {step === 3 && (
          <div>
            <p className="mb-4 text-sm text-yellow-700">
              Use this command only on systems you own or have explicit permission to test. Unauthorized access is illegal.
            </p>
            <pre className="overflow-auto rounded bg-black p-2 text-green-400">{command}</pre>
          </div>
        )}
        <div className="mt-4 flex justify-between">
          {step > 0 && step < 3 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded bg-gray-300 px-4 py-2"
            >
              Back
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={handleNext}
              className="ml-auto rounded bg-blue-600 px-4 py-2 text-white"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HydraPreview;

