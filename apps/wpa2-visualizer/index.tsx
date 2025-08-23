import React, { useState, useEffect } from 'react';

const steps = [
  {
    label: 'Message 1: AP → Client (ANonce)',
    caption: 'AP sends a nonce (ANonce) to the client.'
  },
  {
    label: 'Message 2: Client → AP (SNonce, MIC)',
    caption: 'Client generates SNonce and derives the PTK:\nPTK = PRF(PMK, ANonce, SNonce, MAC_AP, MAC_Client).'
  },
  {
    label: 'Message 3: AP → Client (GTK, MIC)',
    caption: 'AP verifies the MIC, derives the GTK and sends it encrypted to the client.'
  },
  {
    label: 'Message 4: Client → AP (ACK)',
    caption: 'Client installs PTK and GTK and sends the final acknowledgment.'
  }
];

const WPA2Visualizer = () => {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (step >= steps.length) return;
    const id = setTimeout(() => setStep(step + 1), 3000);
    return () => clearTimeout(id);
  }, [running, step]);

  const toggle = () => setRunning(!running);
  const reset = () => {
    setRunning(false);
    setStep(0);
  };

  return (
    <div className="w-full h-full bg-ub-cool-grey text-white flex flex-col p-4">
      <h2 className="text-center text-2xl mb-4">WPA2 4-Way Handshake</h2>
      <div className="relative flex-1 flex items-center justify-center max-w-xl mx-auto w-full">
        <div className="absolute left-0 top-0">AP</div>
        <div className="absolute right-0 top-0">Client</div>
        {step >= 1 && (
          <div className="absolute left-0 top-12 animate-l2r">
            <div className="px-2 py-1 bg-blue-600">M1: ANonce</div>
          </div>
        )}
        {step >= 2 && (
          <div className="absolute right-0 top-24 animate-r2l">
            <div className="px-2 py-1 bg-green-600">M2: SNonce + MIC</div>
          </div>
        )}
        {step >= 3 && (
          <div className="absolute left-0 top-36 animate-l2r">
            <div className="px-2 py-1 bg-purple-600">M3: GTK + MIC</div>
          </div>
        )}
        {step >= 4 && (
          <div className="absolute right-0 top-48 animate-r2l">
            <div className="px-2 py-1 bg-red-600">M4: ACK</div>
          </div>
        )}
      </div>
      <div className="mt-4 min-h-[5rem]">
        {step > 0 && step <= steps.length && (
          <>
            <div className="font-bold mb-1">{steps[step - 1].label}</div>
            <div className="whitespace-pre-line">{steps[step - 1].caption}</div>
          </>
        )}
      </div>
      <div className="flex justify-center space-x-2 mt-4">
        <button className="px-3 py-1 bg-gray-700" onClick={toggle}>
          {running ? 'Pause' : step === 0 ? 'Start' : 'Resume'}
        </button>
        <button className="px-3 py-1 bg-gray-700" onClick={reset}>
          Reset
        </button>
      </div>
      <div className="mt-4 text-sm">
        <p>
          PTK (Pairwise Transient Key) is derived from the shared PMK, ANonce, SNonce
          and the MAC addresses of both parties.
        </p>
        <p>
          GTK (Group Temporal Key) is created by the access point to protect broadcast
          and multicast traffic and is delivered in message 3.
        </p>
      </div>
      <style jsx>{`
        @keyframes l2r {
          from { transform: translateX(0); }
          to { transform: translateX(16rem); }
        }
        @keyframes r2l {
          from { transform: translateX(0); }
          to { transform: translateX(-16rem); }
        }
        .animate-l2r { animation: l2r 3s linear forwards; }
        .animate-r2l { animation: r2l 3s linear forwards; }
      `}</style>
    </div>
  );
};

export default WPA2Visualizer;

