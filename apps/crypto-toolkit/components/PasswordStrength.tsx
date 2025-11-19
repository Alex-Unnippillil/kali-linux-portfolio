import React, { useMemo, useState } from 'react';
import { zxcvbn, zxcvbnOptions, ZxcvbnResult } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary } from '@zxcvbn-ts/language-common';

const translations = {
  warnings: {
    straightRow: 'Straight rows of keys on your keyboard are easy to guess.',
    keyPattern: 'Short keyboard patterns are easy to guess.',
    simpleRepeat: 'Repeated characters like "aaa" are easy to guess.',
    extendedRepeat: 'Repeated character patterns like "abcabcabc" are easy to guess.',
    sequences: 'Common character sequences like "abc" are easy to guess.',
    recentYears: 'Recent years are easy to guess.',
    dates: 'Dates are easy to guess.',
    topTen: 'This is a heavily used password.',
    topHundred: 'This is a frequently used password.',
    common: 'This is a commonly used password.',
    similarToCommon: 'This is similar to a commonly used password.',
    wordByItself: 'Single words are easy to guess.',
    namesByThemselves: 'Single names or surnames are easy to guess.',
    commonNames: 'Common names and surnames are easy to guess.',
    userInputs: 'There should not be any personal or page related data.',
    pwned: 'Your password was exposed by a data breach on the Internet.',
  },
  suggestions: {
    l33t: "Avoid predictable letter substitutions like '@' for 'a'.",
    reverseWords: 'Avoid reversed spellings of common words.',
    allUppercase: 'Capitalize some, but not all letters.',
    capitalization: 'Capitalize more than the first letter.',
    dates: 'Avoid dates and years that are associated with you.',
    recentYears: 'Avoid recent years.',
    associatedYears: 'Avoid years that are associated with you.',
    sequences: 'Avoid common character sequences.',
    repeated: 'Avoid repeated words and characters.',
    longerKeyboardPattern: 'Use longer keyboard patterns and change typing direction multiple times.',
    anotherWord: 'Add more words that are less common.',
    useWords: 'Use multiple words, but avoid common phrases.',
    noNeed: 'You can create strong passwords without using symbols, numbers, or uppercase letters.',
    pwned: 'If you use this password elsewhere, you should change it.',
  },
  timeEstimation: {
    ltSecond: 'less than a second',
    second: '{base} second',
    seconds: '{base} seconds',
    minute: '{base} minute',
    minutes: '{base} minutes',
    hour: '{base} hour',
    hours: '{base} hours',
    day: '{base} day',
    days: '{base} days',
    month: '{base} month',
    months: '{base} months',
    year: '{base} year',
    years: '{base} years',
    centuries: 'centuries',
  },
} as const;

type StrengthScale = 0 | 1 | 2 | 3 | 4;

const STRENGTH_STATES: Record<StrengthScale, { label: string; description: string; bar: string; text: string }> = {
  0: {
    label: 'Very weak',
    description: 'This password can be cracked almost instantly. Try mixing uncommon words and symbols.',
    bar: 'bg-red-600',
    text: 'text-red-400',
  },
  1: {
    label: 'Weak',
    description: 'Add more variety and length to slow down basic attacks.',
    bar: 'bg-orange-500',
    text: 'text-orange-300',
  },
  2: {
    label: 'Fair',
    description: 'Better, but still susceptible to targeted guesses. Add another uncommon word.',
    bar: 'bg-yellow-500',
    text: 'text-yellow-300',
  },
  3: {
    label: 'Strong',
    description: 'Resists common attacks. Consider unique substitutions to harden further.',
    bar: 'bg-emerald-500',
    text: 'text-emerald-300',
  },
  4: {
    label: 'Very strong',
    description: 'Great job! Keep this password unique across accounts.',
    bar: 'bg-emerald-600',
    text: 'text-emerald-200',
  },
};

const CRACK_TIME_LABELS: Array<{
  key: keyof ZxcvbnResult['crackTimesDisplay'];
  label: string;
}> = [
  { key: 'onlineThrottling100PerHour', label: 'Online attack (100/h)' },
  { key: 'onlineNoThrottling10PerSecond', label: 'Online attack (10/s)' },
  { key: 'offlineSlowHashing1e4PerSecond', label: 'Offline slow hashing (10⁴/s)' },
  { key: 'offlineFastHashing1e10PerSecond', label: 'Offline fast hashing (10¹⁰/s)' },
];

const numberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

let configured = false;

const configureZxcvbn = () => {
  if (configured) return;
  // Trim the bundled dictionaries so each evaluation stays under the 50 ms budget.
  const trimmedDictionary: typeof dictionary = {
    passwords: dictionary.passwords.slice(0, 3500),
    diceware: dictionary.diceware.slice(0, 3500),
  };

  zxcvbnOptions.setOptions({
    dictionary: trimmedDictionary,
    graphs: adjacencyGraphs,
    translations,
  });
  configured = true;
};

const computeEntropy = (guesses: number, hasInput: boolean) => {
  if (!hasInput) return 0;
  return Math.max(0, Math.log2(Math.max(guesses, 1)));
};

const PasswordStrength: React.FC = () => {
  configureZxcvbn();
  const [password, setPassword] = useState('');

  const analysis = useMemo(() => {
    const result = zxcvbn(password);
    const entropy = computeEntropy(result.guesses, Boolean(password));
    return {
      ...result,
      entropy,
    };
  }, [password]);

  const state = STRENGTH_STATES[analysis.score];
  const progressValues = [0, 25, 50, 75, 100];
  const progress = password ? progressValues[analysis.score] : 0;
  const warning = analysis.feedback.warning;
  const suggestions = analysis.feedback.suggestions;

  return (
    <section className="flex h-full flex-col gap-4 rounded-lg bg-slate-900 p-4 text-slate-100" aria-live="polite">
      <div>
        <label htmlFor="password-strength-input" className="block text-sm font-medium text-slate-300">
          Test a password
        </label>
        <input
          id="password-strength-input"
          data-testid="password-input"
          type="password"
          autoComplete="off"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-base text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <div className="h-3 rounded-full bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div
            className={`h-full rounded-full transition-[width] duration-150 ease-out ${state.bar}`}
            style={{ width: `${progress}%` }}
            data-testid="strength-meter"
          />
        </div>
        <div className={`mt-2 text-sm font-semibold ${password ? state.text : 'text-slate-400'}`} data-testid="strength-label">
          {password ? state.label : 'Start typing to analyze strength'}
        </div>
        <p className="mt-1 text-xs text-slate-400" data-testid="strength-description">
          {password ? state.description : 'We never send your password anywhere. Analysis runs entirely in your browser.'}
        </p>
      </div>
      <dl className="grid gap-2 rounded-md bg-slate-800/60 p-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-300">Entropy</dt>
          <dd data-testid="entropy-value" data-raw={analysis.entropy.toString()}>
            {analysis.entropy.toFixed(2)} bits
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-300">Estimated guesses</dt>
          <dd data-testid="guesses-value" data-raw={analysis.guesses.toString()}>
            {numberFormatter.format(Math.max(analysis.guesses, 0))}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-300">Analysis time</dt>
          <dd data-testid="analysis-time" data-raw={analysis.calcTime.toString()}>
            {analysis.calcTime.toFixed(1)} ms
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-300">Score</dt>
          <dd data-testid="score-value">{analysis.score} / 4</dd>
        </div>
      </dl>
      <div className="grid gap-2 rounded-md bg-slate-800/40 p-3 text-xs">
        {CRACK_TIME_LABELS.map(({ key, label }) => (
          <div key={key} className="flex justify-between gap-2" data-testid={`crack-${key}`}>
            <span className="font-semibold text-slate-300">{label}</span>
            <span className="text-right text-slate-200">{analysis.crackTimesDisplay[key]}</span>
          </div>
        ))}
      </div>
      <div className="rounded-md bg-slate-800/30 p-3 text-xs">
        <p className="font-semibold text-slate-300">Feedback</p>
        {password ? (
          <ul className="mt-2 space-y-1 text-slate-200" data-testid="feedback-list">
            {warning && <li className="text-amber-300">⚠️ {warning}</li>}
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))
            ) : (
              !warning && <li>Your password looks solid. Just keep it unique.</li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-slate-400">Enter a password to receive guidance.</p>
        )}
      </div>
    </section>
  );
};

export default PasswordStrength;
