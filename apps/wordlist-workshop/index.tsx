import React, { useState, useEffect, useCallback } from 'react';

const leetMap: Record<string, string[]> = {
  a: ['4', '@'],
  b: ['8'],
  e: ['3'],
  i: ['1'],
  o: ['0'],
  s: ['5', '$'],
  t: ['7'],
};

const generateCase = (word: string) => {
  let results: string[] = [''];
  for (const ch of word) {
    if (/[^a-zA-Z]/.test(ch)) {
      results = results.map((p) => p + ch);
    } else {
      const lower = ch.toLowerCase();
      const upper = ch.toUpperCase();
      results = results.flatMap((p) => [p + lower, p + upper]);
    }
  }
  return results;
};

const applyLeet = (word: string) => {
  let results: string[] = [''];
  for (const ch of word) {
    const options = [ch];
    const mapped = leetMap[ch.toLowerCase()];
    if (mapped) options.push(...mapped);
    results = results.flatMap((p) => options.map((o) => p + o));
  }
  return results;
};

const WordlistWorkshop: React.FC = () => {
  const [base, setBase] = useState('');
  const [useCase, setUseCase] = useState(false);
  const [useLeet, setUseLeet] = useState(false);
  const [useNumbers, setUseNumbers] = useState(false);
  const [maxNumber, setMaxNumber] = useState(0);
  const [output, setOutput] = useState('');
  const [estimate, setEstimate] = useState(0);

  const calculateEstimate = useCallback(() => {
    const words = base.split(/\s+/).filter(Boolean);
    let total = 0;
    words.forEach((word) => {
      let count = 1;
      for (const ch of word) {
        let opts = 1;
        if (useCase && /[a-z]/i.test(ch)) opts *= 2;
        const mapped = leetMap[ch.toLowerCase()];
        if (useLeet && mapped) opts *= mapped.length + 1;
        count *= opts;
      }
      if (useNumbers) count *= maxNumber + 1;
      total += count;
    });
    return total;
  }, [base, useCase, useLeet, useNumbers, maxNumber]);

  useEffect(() => {
    setEstimate(calculateEstimate());
  }, [calculateEstimate]);

  const generate = () => {
    const words = base.split(/\s+/).filter(Boolean);
    let results: string[] = [];
    words.forEach((word) => {
      let variants = [word];
      if (useCase) variants = variants.flatMap(generateCase);
      if (useLeet) variants = variants.flatMap(applyLeet);
      if (useNumbers) {
        const nums: string[] = [];
        for (let i = 0; i <= maxNumber; i += 1) nums.push(String(i));
        variants = variants.flatMap((v) => nums.map((n) => v + n));
      }
      results = results.concat(variants);
    });
    setOutput(results.join('\n'));
    setEstimate(results.length);
  };

  const exportText = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wordlist.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div>
        <label htmlFor="base" className="block mb-1">Base words</label>
        <textarea
          id="base"
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="w-full h-24 text-black px-2 py-1"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={useCase} onChange={(e) => setUseCase(e.target.checked)} />
          <span>Case permutations</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={useLeet} onChange={(e) => setUseLeet(e.target.checked)} />
          <span>Leet substitutions</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} />
          <span>Append numbers</span>
        </label>
        {useNumbers && (
          <div className="pl-6">
            <label htmlFor="maxNumber" className="mr-2">Max number</label>
            <input
              id="maxNumber"
              type="number"
              min={0}
              max={999}
              value={maxNumber}
              onChange={(e) => setMaxNumber(parseInt(e.target.value, 10) || 0)}
              className="text-black px-2 w-20"
            />
          </div>
        )}
      </div>
      <div data-testid="estimate">Estimated combinations: {estimate}</div>
      <div className="flex space-x-2">
        <button type="button" onClick={generate} className="px-3 py-1 bg-green-600 rounded">Generate</button>
        <button type="button" onClick={exportText} className="px-3 py-1 bg-blue-600 rounded" disabled={!output}>Export</button>
      </div>
      <textarea
        readOnly
        value={output}
        data-testid="output"
        className="flex-1 text-black px-2 py-1"
      />
      <p className="text-xs text-gray-400">
        This workshop is for educational purposes. Combination counts grow rapidly; keep inputs small and use responsibly.
      </p>
    </div>
  );
};

export default WordlistWorkshop;
