'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { copyToClipboard } from '../utils/clipboard';

interface NotesPageState {
  notes: unknown[] | null;
  error?: string;
}

export default function NotesPage() {
  const [state, setState] = useState<NotesPageState>({ notes: null });
  const [copyMessage, setCopyMessage] = useState('');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase env vars missing; notes feature disabled');
      setState({ notes: null, error: 'supabase_unavailable' });
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    supabase
      .from('notes')
      .select()
      .then(({ data, error }) => {
        if (error) {
          setState({ notes: null, error: error.message });
        } else {
          setState({ notes: data ?? null });
        }
      });
  }, [supabaseKey, supabaseUrl]);

  const connectionFields = [
    {
      id: 'supabase-url',
      label: 'Supabase URL',
      value: supabaseUrl ?? '',
      helper: 'Base URL for the Supabase project REST API.',
    },
    {
      id: 'supabase-anon-key',
      label: 'Supabase anon key',
      value: supabaseKey ?? '',
      helper: 'Public anon key used by browser clients to read data.',
    },
  ];

  const handleCopy = async (value: string, label: string) => {
    if (!value) return;
    const success = await copyToClipboard(value);
    setCopyMessage(
      success
        ? `${label} copied to clipboard.`
        : `Unable to copy ${label}. Highlight and copy it manually.`
    );
  };

  const notesJson = JSON.stringify(state.notes ?? [], null, 2);
  const connectionAlert =
    state.error === 'supabase_unavailable'
      ? 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Supabase-backed notes.'
      : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-800">Supabase connection</h1>
          <p className="mt-1 text-sm text-gray-600">
            Verify the credentials used for the notes preview. Copy each value when
            configuring a new environment.
          </p>
          <ul className="mt-4 space-y-3">
            {connectionFields.map((field) => {
              const isConfigured = Boolean(field.value);
              return (
                <li
                  key={field.id}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                        {field.label}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-gray-900" id={`${field.id}-value`}>
                        {isConfigured ? field.value : 'Not configured'}
                      </p>
                      <p className="mt-1 text-[0.65rem] text-gray-500">{field.helper}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => handleCopy(field.value, field.label)}
                      disabled={!isConfigured}
                      aria-disabled={!isConfigured}
                      aria-describedby={`${field.id}-value`}
                    >
                      Copy
                      <span className="sr-only"> {field.label}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {copyMessage && (
            <p role="status" aria-live="polite" className="mt-3 text-xs text-gray-600">
              {copyMessage}
            </p>
          )}
          {connectionAlert && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
            >
              {connectionAlert}
            </p>
          )}
        </section>
        <section className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800">Stored notes preview</h2>
          {state.error && state.error !== 'supabase_unavailable' ? (
            <div
              role="alert"
              className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              Failed to load notes: {state.error}
            </div>
          ) : (
            <pre className="mt-3 max-h-[50vh] overflow-auto rounded-md border border-gray-200 bg-gray-900 p-3 text-xs text-gray-100">
              {notesJson}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}

