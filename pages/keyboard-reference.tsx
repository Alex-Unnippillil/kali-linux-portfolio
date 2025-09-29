import React from 'react';
import {
  DESKTOP_GESTURES,
  DESKTOP_KEY_BINDING_SECTIONS,
} from '../data/desktop/interactionGuides';

const KeyboardReference = () => (
  <main className="min-h-screen bg-ub-cool-grey text-white p-6 space-y-10">
    <header className="space-y-2">
      <h1 className="text-3xl font-bold">Desktop keyboard reference</h1>
      <p className="text-sm text-gray-200">
        These shortcuts and gestures power the Kali-inspired desktop. They mirror the metadata used by the
        in-app cheat sheet overlay so updates stay in sync.
      </p>
    </header>

    {DESKTOP_KEY_BINDING_SECTIONS.map((section) => (
      <section key={section.id} aria-labelledby={`${section.id}-heading`} className="space-y-4">
        <h2 id={`${section.id}-heading`} className="text-xl font-semibold">
          {section.title}
        </h2>
        <ul className="space-y-4">
          {section.bindings.map((binding) => (
            <li
              key={binding.id}
              className="rounded-xl border border-ubt-grey/60 bg-black/40 p-4 shadow-inner"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium">{binding.title}</h3>
                  <p className="mt-1 text-sm text-gray-200/80">
                    {binding.note ?? binding.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2" aria-label="Key combination">
                  {binding.displayKeys.map((key) => (
                    <kbd
                      key={key}
                      className="rounded-lg border border-ubt-grey/70 bg-black/60 px-3 py-1 text-sm font-semibold"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    ))}

    <section aria-labelledby="gesture-heading" className="space-y-4">
      <h2 id="gesture-heading" className="text-xl font-semibold">
        Touch gestures
      </h2>
      <ul className="space-y-4">
        {DESKTOP_GESTURES.map((gesture) => (
          <li
            key={gesture.id}
            className="rounded-xl border border-ubt-grey/60 bg-black/40 p-4 shadow-inner"
          >
            <h3 className="text-lg font-medium">{gesture.title}</h3>
            <p className="mt-1 text-sm text-gray-200/80">{gesture.description}</p>
          </li>
        ))}
      </ul>
    </section>
  </main>
);

export default KeyboardReference;
