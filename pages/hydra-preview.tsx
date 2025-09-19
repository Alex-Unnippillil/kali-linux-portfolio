import React, { useMemo } from 'react';
import FormError from '../components/ui/FormError';
import useWizardController from '../hooks/useWizardController';

const protocols = ['ssh', 'ftp', 'http', 'smtp'];

const HydraPreview: React.FC = () => {
  const wizard = useWizardController<{ target: string; protocol: string; wordlist: string }>(
    useMemo(
      () => ({
        paramName: 'step',
        steps: [
          {
            id: 'target',
            initialData: '',
            validate: ({ data }) => {
              if (typeof data !== 'string' || !data.trim()) {
                return 'Target is required';
              }
              return null;
            },
          },
          {
            id: 'protocol',
            initialData: protocols[0],
            validate: ({ data }) => {
              if (typeof data !== 'string' || !data) {
                return 'Protocol is required';
              }
              if (!protocols.includes(data)) {
                return 'Unsupported protocol selected';
              }
              return null;
            },
          },
          {
            id: 'wordlist',
            initialData: '',
            validate: ({ data }) => {
              if (typeof data !== 'string' || !data.trim()) {
                return 'Wordlist is required';
              }
              return null;
            },
          },
          { id: 'review' },
        ],
      }),
      [],
    ),
  );

  const target = wizard.stepData.target ?? '';
  const protocol = wizard.stepData.protocol ?? protocols[0];
  const wordlist = wizard.stepData.wordlist ?? '';
  const error = wizard.stepErrors[wizard.currentStepId];

  const command = `hydra -P ${wordlist} ${protocol}://${target}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-md">
        {error && <FormError className="mb-4 mt-0">{error}</FormError>}
        {wizard.currentStepId === 'target' && (
          <div>
            <label htmlFor="target" className="mb-2 block text-sm font-medium">
              Target Host
            </label>
            <input
              id="target"
              className="mb-4 w-full rounded border p-2"
              type="text"
              value={target}
              onChange={(e) => wizard.updateStepData('target', e.target.value)}
              placeholder="example.com or 192.168.1.1"
            />
          </div>
        )}
        {wizard.currentStepId === 'protocol' && (
          <div>
            <label htmlFor="protocol" className="mb-2 block text-sm font-medium">
              Protocol
            </label>
            <select
              id="protocol"
              className="mb-4 w-full rounded border p-2"
              value={protocol}
              onChange={(e) => wizard.updateStepData('protocol', e.target.value)}
            >
              {protocols.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
        {wizard.currentStepId === 'wordlist' && (
          <div>
            <label htmlFor="wordlist" className="mb-2 block text-sm font-medium">
              Wordlist Path
            </label>
            <input
              id="wordlist"
              className="mb-4 w-full rounded border p-2"
              type="text"
              value={wordlist}
              onChange={(e) => wizard.updateStepData('wordlist', e.target.value)}
              placeholder="/usr/share/wordlists/rockyou.txt"
            />
          </div>
        )}
        {wizard.currentStepId === 'review' && (
          <div>
            <p className="mb-4 text-sm text-yellow-700">
              Use this command only on systems you own or have explicit permission to test. Unauthorized access is illegal.
            </p>
            <pre className="overflow-auto rounded bg-black p-2 text-green-400">{command}</pre>
          </div>
        )}
        <div className="mt-4 flex justify-between">
          {!wizard.isFirst && (
            <button
              type="button"
              onClick={wizard.goBack}
              className="rounded bg-gray-300 px-4 py-2"
            >
              Back
            </button>
          )}
          {!wizard.isLast && (
            <button
              type="button"
              onClick={wizard.goNext}
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

