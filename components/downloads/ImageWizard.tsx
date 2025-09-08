import React, { useState } from 'react';

const platforms = ['Bare Metal', 'Virtual Machine', 'WSL'];
const desktops = ['GNOME', 'XFCE', 'KDE'];

function getRecommendation(platform: string, desktop: string) {
  if (platform === 'Virtual Machine') {
    return `Use the Kali ${desktop} virtual machine image.`;
  }
  if (platform === 'WSL') {
    return `Use Kali ${desktop} on WSL.`;
  }
  return `Use the Kali ${desktop} installer image.`;
}

export default function ImageWizard() {
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState('');
  const [desktop, setDesktop] = useState('');

  const nextDisabled =
    (step === 0 && !platform) ||
    (step === 1 && !desktop);

  const next = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const reset = () => {
    setStep(0);
    setPlatform('');
    setDesktop('');
  };

  return (
    <div className="mb-8">
      {step === 0 && (
        <fieldset>
          <legend className="mb-2 font-medium">How do you plan to run Kali?</legend>
          <ul className="space-y-2">
            {platforms.map((p) => (
              <li key={p}>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="platform"
                    value={p}
                    checked={platform === p}
                    onChange={() => setPlatform(p)}
                  />
                  <span>{p}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset>
          <legend className="mb-2 font-medium">Choose a desktop environment</legend>
          <ul className="space-y-2">
            {desktops.map((d) => (
              <li key={d}>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="desktop"
                    value={d}
                    checked={desktop === d}
                    onChange={() => setDesktop(d)}
                  />
                  <span>{d}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {step === 2 && (
        <div className="p-4 border rounded">
          <p className="font-semibold">{getRecommendation(platform, desktop)}</p>
          <p className="text-sm mt-2">
            This is a non-authoritative recommendation. For details, see{' '}
            <a
              href="https://www.kali.org/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600"
            >
              the documentation
            </a>
            .
          </p>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Start over
          </button>
        </div>
      )}

      {step < 2 && (
        <div className="mt-4 flex justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={next}
            disabled={nextDisabled}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {step === 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}

