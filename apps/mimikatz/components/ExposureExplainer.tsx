'use client';

import React, { useEffect, useState } from 'react';

interface Step {
  title: string;
  description: string;
  visual: React.ReactNode;
}

const steps: Step[] = [
  {
    title: 'LSASS Running',
    description:
      'The Local Security Authority Subsystem Service stores authentication secrets in memory while the system is running.',
    visual: (
      <div className="relative w-64 h-32 border-2 border-blue-400 flex items-center justify-center">
        <span className="text-blue-200 font-bold">LSASS Memory</span>
      </div>
    ),
  },
  {
    title: 'Memory Dump Attempt',
    description:
      'An attacker attempts to dump the LSASS process memory to extract credentials.',
    visual: (
      <div className="relative w-64 h-32 border-2 border-blue-400">
        <div className="absolute inset-0 bg-red-500 opacity-40 animate-pulse" />
        <span className="absolute inset-0 flex items-center justify-center text-red-200 font-bold">
          Dumping...
        </span>
      </div>
    ),
  },
  {
    title: 'Credential Extraction',
    description:
      'Tools like Mimikatz parse the dump looking for passwords, hashes, or Kerberos tickets.',
    visual: (
      <div className="relative w-64 h-32 border-2 border-blue-400 flex flex-col justify-center p-2">
        <div className="h-3 bg-green-500 mb-1 animate-bounce" />
        <div className="h-3 bg-green-500 mb-1 animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="h-3 bg-green-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    ),
  },
  {
    title: 'Mitigation',
    description:
      'Enable protections such as Credential Guard and enforce least privilege to reduce exposure.',
    visual: (
      <div className="relative w-64 h-32 border-2 border-green-400 flex items-center justify-center">
        <span className="text-green-200 font-bold">Guarded</span>
      </div>
    ),
  },
];

const ExposureExplainer: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const currentStep = steps[index] ?? steps[0];

  return (
    <div className="text-white p-4">
      <div className="bg-yellow-400 text-black text-center font-bold mb-4">
        Demonstration of LSASS memory exposure for educational purposes only.
      </div>
      <div className="relative h-40 flex items-center justify-center mb-4">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className={`absolute transition-opacity duration-700 ease-in-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {step.visual}
          </div>
        ))}
      </div>
      <h3 className="text-lg font-bold text-center mb-2">{currentStep.title}</h3>
      <p className="text-center max-w-md mx-auto mb-4">{currentStep.description}</p>
      <div className="flex justify-center space-x-2">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-3 w-3 rounded-full ${
              i === index ? 'bg-blue-400' : 'bg-gray-600'
            }`}
            aria-label={`Show step ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ExposureExplainer;
