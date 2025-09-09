"use client";

import { useState } from "react";

const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
type Algorithm = (typeof algorithms)[number];

async function digest(alg: Algorithm, text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(alg, data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function HashModule() {
  const [input, setInput] = useState("");
  const [algorithm, setAlgorithm] = useState<Algorithm>("SHA-256");
  const [output, setOutput] = useState("");

  const handleChange = async (val: string, alg: Algorithm) => {
    setInput(val);
    if (!val) {
      setOutput("");
      return;
    }
    try {
      const hash = await digest(alg, val);
      setOutput(hash);
    } catch {
      setOutput("error");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg">Hash Generator</h2>
      <textarea
        className="text-black p-1 rounded min-h-24"
        value={input}
        onChange={(e) => handleChange(e.target.value, algorithm)}
        aria-label="Input text"
      />
      <div className="flex items-center gap-2">
        <label className="text-sm">Algorithm</label>
        <select
          className="text-black p-1 rounded"
          value={algorithm}
          onChange={async (e) => {
            const alg = e.target.value as Algorithm;
            setAlgorithm(alg);
            if (input) {
              try {
                const hash = await digest(alg, input);
                setOutput(hash);
              } catch {
                setOutput("error");
              }
            }
          }}
        >
          {algorithms.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <output aria-live="polite" className="font-mono break-all">
        {output}
      </output>
    </div>
  );
}

