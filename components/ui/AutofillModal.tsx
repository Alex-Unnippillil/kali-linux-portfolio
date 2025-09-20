import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AutofillRequestDetails,
  cancelAutofill,
  confirmAutofill,
  subscribeAutofillRequests,
} from '../../utils/passClient';

const formatFieldLabel = (field: string) =>
  field
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const AutofillModal: React.FC = () => {
  const [request, setRequest] = useState<AutofillRequestDetails | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAutofillRequests((nextRequest) => {
      setRequest(nextRequest);
      if (nextRequest.itemIdHint && nextRequest.items.some((item) => item.id === nextRequest.itemIdHint)) {
        setSelectedId(nextRequest.itemIdHint);
      } else if (nextRequest.items.length === 1) {
        setSelectedId(nextRequest.items[0].id);
      } else {
        setSelectedId('');
      }
      setError(null);
    });
    return unsubscribe;
  }, []);

  const closeModal = useCallback(() => {
    setRequest(null);
    setSelectedId('');
    setError(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (request) {
      cancelAutofill(request.id);
    }
    closeModal();
  }, [request, closeModal]);

  useEffect(() => {
    if (!request) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request, handleCancel]);

  const hasRequest = Boolean(request);
  const items = useMemo(() => request?.items ?? [], [request]);

  if (!hasRequest || !request) {
    return null;
  }

  const fieldLabel = formatFieldLabel(request.secretField);
  const headingId = 'autofill-modal-heading';
  const descriptionId = 'autofill-modal-description';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) {
      setError('Choose which credential to use.');
      return;
    }
    const ok = confirmAutofill(request.id, selectedId);
    if (!ok) {
      setError('That entry is missing the requested field.');
      return;
    }
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="w-full max-w-xl rounded-lg bg-gray-900 text-white shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <header>
            <h2 id={headingId} className="text-lg font-semibold">
              Autofill request
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-gray-300">
              Fill the {fieldLabel.toLowerCase()} field in {request.targetAppId}
              {request.targetLabel ? ` – ${request.targetLabel}` : ''} using a stored secret.
            </p>
          </header>

          <section className="flex flex-col gap-2">
            {items.length === 0 ? (
              <p className="rounded border border-gray-700 bg-gray-800 p-3 text-sm text-gray-300">
                No stored credentials available. Add secrets to the simulated pass store to use autofill.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded border border-gray-800">
                <ul className="divide-y divide-gray-800">
                  {items.map((item) => (
                    <li key={item.id} className="bg-gray-900 hover:bg-gray-800">
                      <label className="flex cursor-pointer items-start gap-3 p-3 text-sm">
                        <input
                          type="radio"
                          name="autofill-item"
                          value={item.id}
                          checked={selectedId === item.id}
                          onChange={() => {
                            setSelectedId(item.id);
                            setError(null);
                          }}
                          className="mt-1"
                        />
                        <span className="flex flex-col">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs text-gray-400">{item.id}</span>
                          {item.url ? (
                            <span className="text-xs text-gray-400">{item.url}</span>
                          ) : null}
                          <span className="text-xs text-gray-500">
                            Available fields: {Object.keys(item.fields).join(', ')}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </section>

          <footer className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={items.length === 0}
              className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              Fill
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AutofillModal;

