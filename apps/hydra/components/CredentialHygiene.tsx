"use client";

import React from "react";

const weakPasswords = [
  { pattern: "123456", count: 290491 },
  { pattern: "password", count: 213139 },
  { pattern: "123456789", count: 79309 },
  { pattern: "12345", count: 48750 },
  { pattern: "qwerty", count: 35552 },
];

const commonMistakes = [
  'Simple sequences like "abcd" or "1234".',
  'Keyboard patterns such as "qwerty" or "asdfgh".',
  'Leet speak substitutions (e.g., "p@ssw0rd").',
  "Reused passwords across multiple sites.",
];

const CredentialHygiene: React.FC = () => {
  const maxCount = Math.max(...weakPasswords.map((p) => p.count));

  return (
    <section className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Password Pattern Pitfalls</h2>
      <p className="mb-4 text-sm text-gray-300">
        For educational purposes only. These commonly leaked passwords highlight
        patterns attackers try first. Avoid these predictable choices when
        creating credentials.
      </p>
      <ul className="mb-6">
        {weakPasswords.map((p) => (
          <li key={p.pattern} className="mb-2">
            <div className="flex justify-between text-sm">
              <span className="font-mono">{p.pattern}</span>
              <span className="text-gray-400">{p.count.toLocaleString()}</span>
            </div>
            <div className="bg-gray-700 h-2 rounded">
              <div
                className="bg-red-500 h-2 rounded"
                style={{ width: `${(p.count / maxCount) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <h3 className="text-xl font-semibold mb-2">Common Mistakes</h3>
      <ul className="list-disc pl-5 mb-6 text-sm text-gray-300">
        {commonMistakes.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="text-sm text-gray-300">
        <strong>Best practices:</strong>{" "}
        <a
          href="https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          OWASP Authentication Cheat Sheet
        </a>{" "}
        •{" "}
        <a
          href="https://pages.nist.gov/800-63-3/sp800-63b.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          NIST Digital Identity Guidelines
        </a>
      </p>
    </section>
  );
};

export default CredentialHygiene;
