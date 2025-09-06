"use client";

import { useState } from 'react';

const placeholder = {
  word: "example",
  partOfSpeech: "noun",
  definitions: [
    "a thing characteristic of its kind or illustrating a general rule",
    "a person or thing regarded in terms of their fitness to be imitated"
  ]
};

export default function Dictionary() {
  const [term, setTerm] = useState("");
  const [strategy, setStrategy] = useState("wordnet");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md space-y-4">
        <div>
          <label htmlFor="term" className="block mb-1 text-sm font-medium">Search term</label>
          <input
            id="term"
            value={term}
            onChange={e => setTerm(e.target.value)}
            className="w-full rounded border p-2"
            placeholder="Enter a word"
          />
        </div>
        <div>
          <label htmlFor="strategy" className="block mb-1 text-sm font-medium">Search strategy</label>
          <select
            id="strategy"
            value={strategy}
            onChange={e => setStrategy(e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="wordnet">Wordnet</option>
            <option value="dictd">Dictd</option>
          </select>
        </div>
        <div className="mt-6">
          <h2 className="text-xl font-bold">{placeholder.word}</h2>
          <p className="italic text-sm text-gray-700">{placeholder.partOfSpeech}</p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            {placeholder.definitions.map((def, idx) => (
              <li key={idx}>{def}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

