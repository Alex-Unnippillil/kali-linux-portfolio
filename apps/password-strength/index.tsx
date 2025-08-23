import React, { useState } from 'react';
import zxcvbn from 'zxcvbn';

const scoreColors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500','bg-green-700'];
const scoreLabels = ['Very Weak','Weak','Fair','Good','Strong'];

const PasswordStrength: React.FC = () => {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<zxcvbn.ZXCVBNResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [reused, setReused] = useState(false);

  const analyze = () => {
    const reusedBefore = history.includes(password);
    setReused(reusedBefore);
    if (!reusedBefore) {
      setHistory([...history, password]);
    }
    setResult(zxcvbn(password));
  };

  const entropy = result ? Math.log2(result.guesses).toFixed(2) : '';
  const width = result ? `${((result.score + 1) / 5) * 100}%` : '0%';
  const color = result ? scoreColors[result.score] : 'bg-gray-500';
  const label = result ? scoreLabels[result.score] : '';

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2 items-center">
        <input
          aria-label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="flex-1 text-black px-2 py-1"
        />
        <button
          type="button"
          onClick={analyze}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          Check
        </button>
      </div>
      {result && (
        <div className="space-y-2">
          <div>
            <div className="h-2 w-full bg-gray-700 rounded">
              <div className={`h-full ${color} rounded`} style={{ width }} />
            </div>
            <div className="text-sm mt-1">Strength: {label} (Score: {result.score}/4)</div>
          </div>
          <div className="text-sm">Entropy: {entropy} bits</div>
          <div className="text-sm">Guesses: {result.guesses.toLocaleString()}</div>
          {reused && (
            <div className="text-red-400 text-sm">You've used this password before.</div>
          )}
          {result.feedback.warning && (
            <div className="text-yellow-400 text-sm">{result.feedback.warning}</div>
          )}
          {result.feedback.suggestions.length > 0 && (
            <ul className="text-sm list-disc ml-5">
              {result.feedback.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default PasswordStrength;
