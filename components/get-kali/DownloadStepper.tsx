import React, { useState } from 'react';

const steps = ['Platform', 'Desktop', 'Image Type'];

const platforms = ['Bare Metal', 'Virtual Machine', 'Cloud'];
const desktops = ['GNOME', 'KDE Plasma', 'XFCE'];
const imageTypes = ['Installer', 'Net Installer', 'Live'];

export default function DownloadStepper() {
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState('');
  const [desktop, setDesktop] = useState('');
  const [imageType, setImageType] = useState('');

  const nextDisabled =
    (step === 0 && !platform) ||
    (step === 1 && !desktop) ||
    (step === 2 && !imageType);

  const reset = () => {
    setStep(0);
    setPlatform('');
    setDesktop('');
    setImageType('');
  };

  const next = () => {
    if (step < steps.length) {
      setStep(step + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div>
      <ol className="flex space-x-4 mb-4" aria-label="Steps">
        {steps.map((label, index) => (
          <li key={label} className="flex items-center">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index === step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}
              aria-current={index === step ? 'step' : undefined}
            >
              {index + 1}
            </span>
            <span className="ml-2">{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset>
          <legend className="sr-only">Select Platform</legend>
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
          <legend className="sr-only">Select Desktop Environment</legend>
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
        <fieldset>
          <legend className="sr-only">Select Image Type</legend>
          <ul className="space-y-2">
            {imageTypes.map((i) => (
              <li key={i}>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="imageType"
                    value={i}
                    checked={imageType === i}
                    onChange={() => setImageType(i)}
                  />
                  <span>{i}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {step === steps.length && (
        <div className="p-4 bg-green-100 rounded">
          <p className="font-semibold mb-2">Selection complete:</p>
          <ul className="list-disc list-inside">
            <li>Platform: {platform}</li>
            <li>Desktop: {desktop}</li>
            <li>Image Type: {imageType}</li>
          </ul>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Start over
          </button>
        </div>
      )}

      {step < steps.length && (
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
            {step === steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}

