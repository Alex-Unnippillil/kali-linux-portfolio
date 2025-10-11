'use client';

import React, { useState } from 'react';
import johnPlaceholders from '../../../components/apps/john/placeholders';

interface UserRecord {
  username: string;
  password: string;
}

interface Finding {
  user: UserRecord;
  tip: string;
}

const SAMPLE_USERS: UserRecord[] = johnPlaceholders.auditUsers;

const WEAK_PASSWORDS = new Set(johnPlaceholders.weakPasswords);

const AuditSimulator: React.FC = () => {
  const [findings, setFindings] = useState<Finding[]>([]);

  const runAudit = () => {
    const results: Finding[] = SAMPLE_USERS.filter((u) => isWeak(u.password)).map(
      (u) => ({
        user: u,
        tip: 'Use a longer, unique passphrase with numbers and symbols.',
      })
    );
    setFindings(results);
  };

  const isWeak = (pwd: string) => {
    const lower = pwd.toLowerCase();
    if (pwd.length < 8) return true;
    return WEAK_PASSWORDS.has(lower);
  };

  return (
    <div className="bg-gray-800 p-4 rounded text-white">
      <button
        type="button"
        onClick={runAudit}
        className="px-3 py-1 bg-blue-600 rounded"
      >
        Run Audit
      </button>
      {findings.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg mb-2">Weak Password Findings</h3>
          <ul className="space-y-2">
            {findings.map(({ user, tip }) => (
              <li key={user.username} className="bg-gray-900 p-2 rounded">
                <p>
                  <span className="font-mono">{user.username}</span> uses
                  <span className="text-red-400"> {user.password}</span>
                </p>
                <p className="text-yellow-300 text-sm">Tip: {tip}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AuditSimulator;

