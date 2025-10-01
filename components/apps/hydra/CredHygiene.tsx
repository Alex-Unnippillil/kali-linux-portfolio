import React, { useMemo, useState } from 'react';

type WordList = {
  name: string;
  content: string;
};

type Attempt = {
  time?: number;
  user?: string;
  password?: string;
  result?: string;
};

type Warning = {
  id: string;
  message: string;
  redactedMessage: string;
};

type ExportInfo = {
  redacted: boolean;
  payload: string;
};

type Props = {
  target: string;
  service: string;
  userList?: WordList | null;
  passList?: WordList | null;
  attempts: Attempt[];
  onExport?: (info: ExportInfo) => void;
};

const WEAK_PASSWORDS = new Set(
  [
    'password',
    '123456',
    '123456789',
    '12345',
    '12345678',
    'qwerty',
    'abc123',
    'letmein',
    'admin',
    'welcome',
  ].map((value) => value.toLowerCase())
);

const parseEntries = (list?: WordList | null) => {
  if (!list) return { entries: [], blanks: 0 };
  const rawLines = list.content.split(/\r?\n/);
  const trimmed = rawLines.map((line) => line.trim());
  const entries = trimmed.filter((line) => line.length > 0);
  const blanks = rawLines.length - entries.length;
  return { entries, blanks };
};

const findDuplicates = (entries: string[]) => {
  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    const key = entry.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const original = entries.find((value) => value.toLowerCase() === key) || key;
      return { value: original, count };
    });
};

const formatList = (items: string[], limit = 3) => {
  if (!items.length) return '';
  if (items.length <= limit) return items.join(', ');
  return `${items.slice(0, limit).join(', ')} +${items.length - limit}`;
};

const maskValue = (value?: string, placeholder = '[redacted]') => {
  if (!value) return '';
  return placeholder;
};

const CredHygiene: React.FC<Props> = ({
  target,
  service,
  userList,
  passList,
  attempts,
  onExport,
}) => {
  const [revealSecrets, setRevealSecrets] = useState(false);

  const { entries: userEntries, blanks: userBlanks } = useMemo(
    () => parseEntries(userList),
    [userList]
  );
  const { entries: passEntries, blanks: passBlanks } = useMemo(
    () => parseEntries(passList),
    [passList]
  );

  const duplicateUsers = useMemo(
    () => findDuplicates(userEntries),
    [userEntries]
  );
  const duplicatePasswords = useMemo(
    () => findDuplicates(passEntries),
    [passEntries]
  );

  const weakPasswords = useMemo(() => {
    const seen = new Set<string>();
    const weak: string[] = [];
    passEntries.forEach((entry) => {
      const normalized = entry.toLowerCase();
      const tooShort = entry.length < 8;
      if ((tooShort || WEAK_PASSWORDS.has(normalized)) && !seen.has(normalized)) {
        seen.add(normalized);
        weak.push(entry);
      }
    });
    return weak;
  }, [passEntries]);

  const warnings = useMemo<Warning[]>(() => {
    const issues: Warning[] = [];
    if (!userList || userEntries.length === 0) {
      issues.push({
        id: 'user-empty',
        message: userList
          ? `User list "${userList.name}" has no usable entries.`
          : 'No user list selected. Add users before running Hydra.',
        redactedMessage: userList
          ? 'User list has no usable entries.'
          : 'No user list selected.',
      });
    }
    if (userBlanks > 0) {
      issues.push({
        id: 'user-blanks',
        message: `User list contains ${userBlanks} blank entr${
          userBlanks === 1 ? 'y' : 'ies'
        } that will be skipped.`,
        redactedMessage: `User list contains ${userBlanks} blank entr${
          userBlanks === 1 ? 'y' : 'ies'
        }.`,
      });
    }
    if (duplicateUsers.length > 0) {
      const display = duplicateUsers.map((item) => `${item.value} ×${item.count}`);
      issues.push({
        id: 'user-duplicates',
        message: `Duplicate user entries detected: ${formatList(display)}.`,
        redactedMessage: `Duplicate user entries detected (${duplicateUsers.length} unique value${
          duplicateUsers.length === 1 ? '' : 's'
        }).`,
      });
    }
    if (!passList || passEntries.length === 0) {
      issues.push({
        id: 'pass-empty',
        message: passList
          ? `Password list "${passList.name}" has no usable entries.`
          : 'No password list selected. Add passwords before running Hydra.',
        redactedMessage: passList
          ? 'Password list has no usable entries.'
          : 'No password list selected.',
      });
    }
    if (passBlanks > 0) {
      issues.push({
        id: 'pass-blanks',
        message: `Password list contains ${passBlanks} blank entr${
          passBlanks === 1 ? 'y' : 'ies'
        } that will be skipped.`,
        redactedMessage: `Password list contains ${passBlanks} blank entr${
          passBlanks === 1 ? 'y' : 'ies'
        }.`,
      });
    }
    if (duplicatePasswords.length > 0) {
      const display = duplicatePasswords.map((item) => `${item.value} ×${item.count}`);
      issues.push({
        id: 'pass-duplicates',
        message: `Duplicate passwords detected: ${formatList(display)}.`,
        redactedMessage: `Duplicate passwords detected (${duplicatePasswords.length} unique value${
          duplicatePasswords.length === 1 ? '' : 's'
        }).`,
      });
    }
    if (weakPasswords.length > 0) {
      issues.push({
        id: 'weak-passwords',
        message: `Weak passwords flagged: ${formatList(weakPasswords)}.`,
        redactedMessage: `Weak passwords flagged (${weakPasswords.length} entries).`,
      });
    }
    if (!target.trim()) {
      issues.push({
        id: 'target-missing',
        message: 'Target is empty. Set a host or IP to avoid wasted attempts.',
        redactedMessage: 'Target is empty.',
      });
    }
    return issues;
  }, [
    userList,
    passList,
    userEntries.length,
    passEntries.length,
    userBlanks,
    passBlanks,
    duplicateUsers,
    duplicatePasswords,
    weakPasswords,
    target,
  ]);

  const handleExport = async () => {
    const hygieneNotes = warnings.map((warning) =>
      revealSecrets ? warning.message : warning.redactedMessage
    );
    const attemptPayload = attempts.map((attempt, index) => ({
      index: index + 1,
      result: attempt.result,
      elapsedSeconds: attempt.time,
      user: revealSecrets
        ? attempt.user || ''
        : attempt.user
        ? `[user-${index + 1}]`
        : '',
      password: revealSecrets
        ? attempt.password || ''
        : maskValue(attempt.password, '[redacted password]'),
    }));

    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        service,
        target: revealSecrets
          ? target || ''
          : target
          ? '[redacted host]'
          : 'not specified',
        redacted: !revealSecrets,
        wordlists: {
          user: userList
            ? {
                name: userList.name,
                entries: userEntries.length,
                blanks: userBlanks,
                duplicates: duplicateUsers.length,
              }
            : null,
          password: passList
            ? {
                name: passList.name,
                entries: passEntries.length,
                blanks: passBlanks,
                duplicates: duplicatePasswords.length,
                weak: weakPasswords.length,
              }
            : null,
        },
        hygiene: hygieneNotes,
        attempts: attemptPayload,
      },
      null,
      2
    );

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(payload);
      } catch {
        // ignore clipboard failures silently; onExport handler can surface issues
      }
    }

    onExport?.({ redacted: !revealSecrets, payload });
  };

  return (
    <section className="mt-4 rounded border border-gray-800 bg-gray-800/70 p-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Credential hygiene</h3>
        <span className="text-xs text-gray-400">
          {revealSecrets ? 'Exports include raw credentials' : 'Exports are redacted by default'}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-300">
        Quickly audit imported wordlists before launching an attack simulation. Duplicate or
        weak entries slow testing and create noisy results.
      </p>
      <ul className="mt-2 space-y-1 text-gray-200">
        {warnings.length === 0 ? (
          <li className="text-green-400">No hygiene issues detected.</li>
        ) : (
          warnings.map((warning) => (
            <li key={warning.id} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 text-yellow-300">
                •
              </span>
              <span>{warning.message}</span>
            </li>
          ))
        )}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={revealSecrets}
            onChange={(event) => setRevealSecrets(event.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500"
          />
          Reveal credentials in export (unsafe)
        </label>
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-gray-700 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-600"
        >
          Copy session export
        </button>
      </div>
    </section>
  );
};

export default CredHygiene;
