import React, { useMemo, useState, useId } from 'react';
import FormError from '../components/ui/FormError';

const protocols = ['ssh', 'ftp', 'http', 'smtp'];

type HydraField = 'target' | 'protocol' | 'wordlist';

interface HydraError {
  field: HydraField;
  message: string;
}

const HydraPreview: React.FC = () => {
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState('');
  const [protocol, setProtocol] = useState(protocols[0]);
  const [wordlist, setWordlist] = useState('');
  const [error, setError] = useState<HydraError | null>(null);
  const idBase = useId();
  const { errorIds, labelIds } = useMemo(
    () => {
      const sanitizedBase = idBase.replace(/:/g, '');
      return {
        errorIds: {
          target: `hydra-error-${sanitizedBase}-target`,
          protocol: `hydra-error-${sanitizedBase}-protocol`,
          wordlist: `hydra-error-${sanitizedBase}-wordlist`,
        } satisfies Record<HydraField, string>,
        labelIds: {
          target: `hydra-label-${sanitizedBase}-target`,
          protocol: `hydra-label-${sanitizedBase}-protocol`,
          wordlist: `hydra-label-${sanitizedBase}-wordlist`,
        } satisfies Record<HydraField, string>,
      };
    },
    [idBase]
  );

  const next = () => {
    if (step === 0 && !target.trim()) {
      setError({ field: 'target', message: 'Enter a target host.' });
      return;
    }
    if (step === 1 && !protocol) {
      setError({ field: 'protocol', message: 'Choose a protocol.' });
      return;
    }
    if (step === 2 && !wordlist.trim()) {
      setError({ field: 'wordlist', message: 'Provide a wordlist path.' });
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const back = () => {
    setError(null);
    setStep(step - 1);
  };

  const command = `hydra -P ${wordlist} ${protocol}://${target}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-md">
        {error && (
          <FormError id={errorIds[error.field]} className="mb-4 mt-0">
            {error.message}
          </FormError>
        )}
        {step === 0 && (
          <div>
            <label
              htmlFor="target"
              className="mb-2 block text-sm font-medium"
              id={labelIds.target}
            >
              Target Host
            </label>
            <input
              id="target"
              className="mb-4 w-full rounded border p-2"
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="example.com or 192.168.1.1"
              aria-invalid={error?.field === 'target' || undefined}
              aria-describedby={error?.field === 'target' ? errorIds.target : undefined}
              aria-labelledby={labelIds.target}
            />
          </div>
        )}
        {step === 1 && (
          <div>
            <label
              htmlFor="protocol"
              className="mb-2 block text-sm font-medium"
              id={labelIds.protocol}
            >
              Protocol
            </label>
            <select
              id="protocol"
              className="mb-4 w-full rounded border p-2"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              aria-invalid={error?.field === 'protocol' || undefined}
              aria-describedby={error?.field === 'protocol' ? errorIds.protocol : undefined}
              aria-labelledby={labelIds.protocol}
            >
              {protocols.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
        {step === 2 && (
          <div>
            <label
              htmlFor="wordlist"
              className="mb-2 block text-sm font-medium"
              id={labelIds.wordlist}
            >
              Wordlist Path
            </label>
            <input
              id="wordlist"
              className="mb-4 w-full rounded border p-2"
              type="text"
              value={wordlist}
              onChange={(e) => setWordlist(e.target.value)}
              placeholder="/usr/share/wordlists/rockyou.txt"
              aria-invalid={error?.field === 'wordlist' || undefined}
              aria-describedby={error?.field === 'wordlist' ? errorIds.wordlist : undefined}
              aria-labelledby={labelIds.wordlist}
            />
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
              onClick={back}
              className="rounded bg-gray-300 px-4 py-2"
            >
              Back
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={next}
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

