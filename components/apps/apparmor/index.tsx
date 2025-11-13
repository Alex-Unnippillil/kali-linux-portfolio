import React, { useMemo, useState } from 'react';

import {
  AppArmorProfile,
  ProfileStatus,
  computeLearningResult,
  getDefaultSelectedSuggestionIds,
  profileStatusOptions,
  sampleLearningSession,
  sampleProfiles,
} from '../../../utils/apparmorLearner';

const steps = [
  {
    title: 'Baseline profile',
    description:
      'Review the existing policy for the Demo Browser before training begins.',
  },
  {
    title: 'Ingest sample logs',
    description:
      'Process canned AppArmor audit entries to understand what the application attempted.',
  },
  {
    title: 'Select learning suggestions',
    description:
      'Decide which generated rules should be applied to the profile.',
  },
  {
    title: 'Preview generated profile',
    description:
      'Compare the learned profile and diff before rolling out the changes.',
  },
] as const;

const statusColours: Record<ProfileStatus, string> = {
  disabled: 'bg-gray-700 text-gray-200',
  enabled: 'bg-sky-700 text-white',
  complain: 'bg-amber-600 text-black',
  enforce: 'bg-green-600 text-white',
};

const AppArmorLab: React.FC = () => {
  const [profiles, setProfiles] = useState<AppArmorProfile[]>(() =>
    sampleProfiles.map((profile) => ({ ...profile }))
  );
  const [activeStep, setActiveStep] = useState(0);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    () => getDefaultSelectedSuggestionIds(sampleLearningSession)
  );

  const session = sampleLearningSession;
  const orderedSuggestionIds = useMemo(
    () => session.suggestions.map((suggestion) => suggestion.id),
    [session]
  );

  const result = useMemo(
    () => computeLearningResult(session, selectedSuggestionIds),
    [selectedSuggestionIds, session]
  );

  const selectedProfile = profiles.find(
    (profile) => profile.id === session.profileId
  );

  const setProfileStatus = (profileId: string, status: ProfileStatus) => {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId ? { ...profile, status } : profile
      )
    );
  };

  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestionIds((prev) => {
      const next = prev.includes(suggestionId)
        ? prev.filter((id) => id !== suggestionId)
        : [...prev, suggestionId];
      return orderedSuggestionIds.filter((id) => next.includes(id));
    });
  };

  const goToNextStep = () =>
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  const goToPreviousStep = () =>
    setActiveStep((current) => Math.max(current - 1, 0));

  const renderStepContent = () => {
    if (activeStep === 0) {
      return (
        <div className="space-y-3 text-sm text-gray-200">
          <p>
            {`The current profile for ${session.profileName} limits the demo browser to shared libraries and outbound HTTPS.`}
          </p>
          <pre className="max-h-64 overflow-auto rounded border border-gray-700 bg-gray-950 p-3 text-xs text-green-200">
            <code>{session.baseProfile}</code>
          </pre>
          <p>
            {`Learning mode will propose new rules without applying them automatically. Continue through the flow to inspect the generated policy.`}
          </p>
        </div>
      );
    }

    if (activeStep === 1) {
      return (
        <div className="space-y-4">
          {session.suggestions.map((suggestion) => (
            <article
              key={suggestion.id}
              className="rounded border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200"
            >
              <header className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-100">
                  {suggestion.title}
                </h3>
                <span className="rounded bg-slate-700 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-200">
                  {suggestion.category}
                </span>
              </header>
              <p className="mb-2 text-xs text-slate-300">
                {suggestion.rationale}
              </p>
              <p className="rounded bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-amber-200">
                {suggestion.rawLog}
              </p>
            </article>
          ))}
        </div>
      );
    }

    if (activeStep === 2) {
      const selectedSet = new Set(selectedSuggestionIds);
      return (
        <div className="space-y-3">
          {session.suggestions.map((suggestion) => (
            <label
              key={suggestion.id}
              className="block cursor-pointer rounded border border-gray-700 bg-gray-900 p-3 text-sm text-gray-200 transition hover:border-blue-500"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 cursor-pointer accent-blue-500"
                  checked={selectedSet.has(suggestion.id)}
                  onChange={() => toggleSuggestion(suggestion.id)}
                  aria-label={`Include suggestion: ${suggestion.title}`}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-100">
                      {suggestion.title}
                    </h3>
                    <span className="rounded bg-slate-700 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-200">
                      {suggestion.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">{suggestion.rationale}</p>
                  <pre className="overflow-auto rounded bg-black/30 p-2 text-[11px] text-green-200">
                    <code>{suggestion.ruleLines.join('\n')}</code>
                  </pre>
                  <details className="text-xs text-gray-400">
                    <summary className="cursor-pointer text-gray-300">
                      View log excerpt
                    </summary>
                    <p className="mt-1 rounded bg-black/30 p-2 font-mono text-[11px] leading-relaxed text-amber-200">
                      {suggestion.rawLog}
                    </p>
                  </details>
                </div>
              </div>
            </label>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4 text-sm text-gray-200">
        <p>
          {result.appliedSuggestions.length === 0
            ? 'No rules selected. Go back a step to include at least one suggestion before exporting.'
            : 'Learning mode generated the following additions. Review them before committing the profile.'}
        </p>
        {result.appliedSuggestions.length > 0 && (
          <ul className="space-y-2">
            {result.appliedSuggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="rounded border border-slate-700 bg-slate-900 p-3"
              >
                <p className="font-semibold text-gray-100">
                  {suggestion.title}
                </p>
                <pre className="mt-2 overflow-auto rounded bg-black/30 p-2 text-[11px] text-green-200">
                  <code>{suggestion.ruleLines.join('\n')}</code>
                </pre>
              </li>
            ))}
          </ul>
        )}
        <section aria-labelledby="apparmor-preview-heading" className="space-y-2">
          <h3
            id="apparmor-preview-heading"
            className="text-base font-semibold text-gray-100"
          >
            Generated profile
          </h3>
          <pre
            data-testid="apparmor-profile-preview"
            className="max-h-64 overflow-auto rounded border border-gray-700 bg-gray-950 p-3 text-xs text-green-200"
          >
            <code>{result.previewProfile}</code>
          </pre>
        </section>
        <section aria-labelledby="apparmor-diff-heading" className="space-y-2">
          <h3
            id="apparmor-diff-heading"
            className="text-base font-semibold text-gray-100"
          >
            Unified diff
          </h3>
          <pre
            data-testid="apparmor-profile-diff"
            className="max-h-64 overflow-auto rounded border border-gray-700 bg-gray-950 p-3 text-xs text-blue-200"
          >
            <code>{result.diff}</code>
          </pre>
        </section>
      </div>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-950 p-4 text-slate-100">
      <header className="mb-5 space-y-1">
        <h1 className="text-xl font-semibold">AppArmor Profile Lab</h1>
        <p className="text-sm text-slate-300">
          Experiment with a safe AppArmor learning workflow. All data is simulated and never touches your host policies.
        </p>
      </header>

      <section className="mb-6 space-y-4" aria-labelledby="apparmor-profiles-heading">
        <div className="flex items-center justify-between">
          <h2 id="apparmor-profiles-heading" className="text-lg font-semibold">
            Profile catalogue
          </h2>
          <span className="text-xs text-slate-400">
            Toggle enforcement modes to understand how AppArmor manages services.
          </span>
        </div>
        <div className="space-y-3">
          {profiles.map((profile) => (
            <article
              key={profile.id}
              className="rounded border border-slate-800 bg-slate-900 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    {profile.name}
                  </h3>
                  <p className="text-xs text-slate-300">{profile.description}</p>
                  <p className="text-xs text-slate-400">Executable: {profile.path}</p>
                </div>
                <span
                  data-testid={`profile-status-${profile.id}`}
                  className={`rounded px-2 py-1 text-xs font-semibold ${statusColours[profile.status]}`}
                >
                  {profile.status}
                </span>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-xs uppercase tracking-wide text-slate-400">
                  Mode
                </legend>
                <div className="flex flex-wrap gap-3">
                  {profileStatusOptions.map((option) => (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-center gap-2 rounded border border-slate-800 px-2 py-1 text-xs hover:border-blue-500 ${
                        profile.status === option.key ? 'bg-blue-900/40' : 'bg-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`status-${profile.id}`}
                        value={option.key}
                        className="h-3 w-3 cursor-pointer accent-blue-500"
                        checked={profile.status === option.key}
                        onChange={() => setProfileStatus(profile.id, option.key)}
                        aria-label={`${profile.name} ${option.label.toLowerCase()} mode`}
                      />
                      <div>
                        <p className="font-medium text-slate-100">{option.label}</p>
                        <p className="text-[11px] text-slate-400">{option.helper}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="apparmor-learning-heading" className="space-y-4">
        <div>
          <h2
            id="apparmor-learning-heading"
            className="text-lg font-semibold text-slate-100"
          >
            Guided learning mode
          </h2>
          <p className="text-xs text-slate-300">
            Follow the steps below to generate a hardened profile for the Demo Browser. You can move back and forth at any time.
          </p>
        </div>
        <ol className="flex flex-wrap gap-2 text-xs">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className={`rounded px-2 py-1 ${
                index === activeStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              Step {index + 1}: {step.title}
            </li>
          ))}
        </ol>
        <div className="rounded border border-slate-800 bg-slate-900 p-4" aria-live="polite">
          <header className="mb-4">
            <h3 className="text-base font-semibold text-slate-100">
              Step {activeStep + 1}: {steps[activeStep].title}
            </h3>
            <p className="text-xs text-slate-300">{steps[activeStep].description}</p>
            {selectedProfile && (
              <p className="mt-1 text-xs text-slate-400">
                Focus profile: {selectedProfile.name} ({selectedProfile.status})
              </p>
            )}
          </header>
          {renderStepContent()}
          <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-400">
              {result.appliedSuggestions.length} suggestion(s) selected
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={activeStep === 0}
                className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={activeStep === steps.length - 1}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-600/40"
              >
                Next
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
};

export default AppArmorLab;
