'use client';

import { useMemo, type ChangeEvent } from 'react';

import usePersistentState from '@/hooks/usePersistentState';
import {
  DEFAULT_SCREENSHOT_TEMPLATE,
  SCREENSHOT_TEMPLATE_STORAGE_KEY,
  TEMPLATE_VARIABLES,
  describeInvalidCharacter,
  findInvalidTemplateCharacters,
  formatScreenshotName,
  type ScreenshotTemplateContext,
} from '@/utils/capture/screenshotNames';

const PREVIEW_CONTEXT: ScreenshotTemplateContext = {
  app: 'Terminal',
  windowTitle: 'root@demo:~',
  monitor: 'Display-1',
};

export default function ScreenshotSettingsPage() {
  const [template, setTemplate, resetTemplate] = usePersistentState<string>(
    SCREENSHOT_TEMPLATE_STORAGE_KEY,
    () => DEFAULT_SCREENSHOT_TEMPLATE,
    (value): value is string => typeof value === 'string',
  );

  const invalidCharacters = useMemo(
    () => findInvalidTemplateCharacters(template),
    [template],
  );

  const invalidMessage = useMemo(() => {
    if (invalidCharacters.length === 0) return '';
    const parts = invalidCharacters.map((char) => describeInvalidCharacter(char));
    return `Invalid filename characters will be replaced automatically: ${parts.join(', ')}`;
  }, [invalidCharacters]);

  const preview = useMemo(
    () =>
      formatScreenshotName(
        template,
        {
          ...PREVIEW_CONTEXT,
          now: new Date(),
        },
        'png',
      ),
    [template],
  );

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTemplate(event.target.value);
  };

  const warningId = invalidCharacters.length > 0 ? 'screenshot-template-warning' : undefined;

  return (
    <main className="min-h-screen bg-ub-cool-grey text-ubt-grey">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Screenshot naming</h1>
          <p className="max-w-2xl text-sm text-ubt-grey">
            Control how filenames are generated when you capture windows or entire displays.
            Templates support dynamic variables so teams can keep captures organised automatically.
          </p>
        </header>

        <section className="space-y-4 rounded-lg border border-gray-800 bg-black/30 p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="screenshot-template" className="text-sm font-medium text-white">
              Filename template
            </label>
            <input
              id="screenshot-template"
              type="text"
              value={template}
              onChange={onChange}
              aria-invalid={invalidCharacters.length > 0}
              aria-describedby={warningId}
              className="w-full rounded border border-gray-700 bg-black/40 px-3 py-2 text-white focus:border-ubt-cool-grey focus:outline-none focus:ring-2 focus:ring-ub-orange"
              placeholder="{app}-{date}-{time}"
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => resetTemplate()}
                className="rounded border border-gray-700 px-2 py-1 text-ubt-grey transition hover:border-ub-orange hover:text-white"
              >
                Reset to default
              </button>
            </div>
            {warningId && (
              <p id={warningId} className="text-xs text-amber-300">
                {invalidMessage}
              </p>
            )}
          </div>

          <div className="rounded-md bg-black/60 p-4 text-sm">
            <p className="mb-2 text-ubt-grey">Next filename preview</p>
            <code className="block break-words rounded bg-black/40 px-3 py-2 text-emerald-300">
              {preview}
            </code>
            <p className="mt-2 text-xs text-ubt-grey">
              Preview shows how the next PNG capture will be named. Screenshot downloads automatically apply the same sanitising rules across Windows, macOS and Linux.
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-gray-800 bg-black/20 p-6">
          <h2 className="text-lg font-semibold text-white">Available template variables</h2>
          <p className="text-sm text-ubt-grey">
            Insert these tokens into the template field above. They will be replaced with contextual data right before a screenshot is saved.
          </p>
          <ul className="space-y-3">
            {TEMPLATE_VARIABLES.map((variable) => (
              <li key={variable.token} className="flex flex-col gap-1 rounded border border-gray-800 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="rounded bg-black/50 px-2 py-1 text-sm text-ub-orange">
                    {`{${variable.token}}`}
                  </code>
                  <span className="text-xs uppercase tracking-wide text-ubt-grey">{variable.label}</span>
                </div>
                <p className="text-sm text-ubt-grey">{variable.description}</p>
                <p className="text-xs text-ubt-grey">
                  Example:&nbsp;
                  <code className="rounded bg-black/40 px-2 py-0.5 text-emerald-300">{variable.example}</code>
                </p>
                <div className="pt-1 text-right">
                  <button
                    type="button"
                    onClick={() => setTemplate((value) => `${value}{${variable.token}}`)}
                    className="text-xs font-medium text-ub-orange transition hover:text-white"
                  >
                    Insert token
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
