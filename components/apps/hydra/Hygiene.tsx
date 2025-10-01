import React, { useEffect, useMemo } from 'react';

type HygieneFixAction =
  | 'set-target'
  | 'set-rule'
  | 'set-charset'
  | 'replace-user-list'
  | 'replace-pass-list';

export interface HygieneFix {
  action: HygieneFixAction;
  payload: string;
}

export interface WordList {
  name: string;
  content: string;
}

interface HygieneIssue {
  id: string;
  message: string;
  fix?: {
    label: string;
    action: HygieneFixAction;
    payload: string;
  };
}

interface RedactionHint {
  field: 'target' | 'userList' | 'passList';
  message: string;
}

interface HygieneProps {
  target: string;
  rule: string;
  charset: string;
  selectedUserList?: WordList | null;
  selectedPassList?: WordList | null;
  onFix?: (fix: HygieneFix) => void;
  onRedactionChange?: (fields: RedactionHint['field'][]) => void;
}

const ipv4 =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

const hostname =
  /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;

const domainLike = /[A-Za-z0-9-]+\.[A-Za-z]{2,}$/;

const emailPattern = /^[^\s@]+@[^\s@]+$/;

const benignUsernames = new Set(['admin', 'user', 'guest', 'test', 'root']);

const trimLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim());

const buildUniqueList = (content: string) => {
  const trimmed = trimLines(content);
  const seen = new Set<string>();
  const unique = trimmed.filter((line) => {
    if (!line) return false;
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.join('\n');
};

const Hygiene: React.FC<HygieneProps> = ({
  target,
  rule,
  charset,
  selectedUserList,
  selectedPassList,
  onFix,
  onRedactionChange,
}) => {
  const trimmedTarget = target.trim();

  const userLines = useMemo(() => trimLines(selectedUserList?.content || ''), [
    selectedUserList,
  ]);
  const passLines = useMemo(() => trimLines(selectedPassList?.content || ''), [
    selectedPassList,
  ]);

  const issues = useMemo<HygieneIssue[]>(() => {
    const list: HygieneIssue[] = [];

    if (!trimmedTarget) {
      list.push({
        id: 'target-empty',
        message: 'Target is empty. Provide a host to simulate hydra behaviour.',
        fix: {
          label: 'Use demo target',
          action: 'set-target',
          payload: 'demo.local:22',
        },
      });
    }

    if (target !== trimmedTarget && trimmedTarget) {
      list.push({
        id: 'target-whitespace',
        message: 'Target has surrounding whitespace that will break the request.',
        fix: {
          label: 'Trim target',
          action: 'set-target',
          payload: trimmedTarget,
        },
      });
    }

    if (trimmedTarget) {
      const [host, port] = trimmedTarget.split(':');
      const validHost = ipv4.test(host) || hostname.test(host);
      if (!validHost) {
        list.push({
          id: 'target-format',
          message: 'Target does not look like a hostname or IPv4 address.',
          fix: {
            label: 'Use sample host',
            action: 'set-target',
            payload: 'example.com:22',
          },
        });
      }
      if (port && !/^\d+$/.test(port)) {
        list.push({
          id: 'target-port',
          message: 'Port contains non-numeric characters. Hydra expects digits only.',
          fix: {
            label: 'Strip port symbols',
            action: 'set-target',
            payload: `${host}:${port.replace(/[^\d]/g, '') || '22'}`,
          },
        });
      }
    }

    if (!rule.trim()) {
      list.push({
        id: 'rule-empty',
        message: 'Rule range is empty. Define a min:max length to generate candidates.',
        fix: {
          label: 'Reset rule',
          action: 'set-rule',
          payload: '1:3',
        },
      });
    } else {
      const ruleMatch = rule.trim().match(/^(\d+)\s*:\s*(\d+)$/);
      if (!ruleMatch) {
        list.push({
          id: 'rule-format',
          message: 'Rule must use the min:max format (for example 1:4).',
          fix: {
            label: 'Normalize rule',
            action: 'set-rule',
            payload: '1:4',
          },
        });
      } else {
        const min = parseInt(ruleMatch[1], 10);
        const max = parseInt(ruleMatch[2], 10);
        if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
          list.push({
            id: 'rule-order',
            message: 'Rule minimum is greater than maximum. Swap the values.',
            fix: {
              label: 'Swap bounds',
              action: 'set-rule',
              payload: `${Math.min(min, max)}:${Math.max(min, max)}`,
            },
          });
        }
      }
    }

    if (!charset.trim()) {
      list.push({
        id: 'charset-empty',
        message: 'Charset is empty. Provide characters for mask generation.',
        fix: {
          label: 'Restore default charset',
          action: 'set-charset',
          payload: 'abc123',
        },
      });
    } else {
      if (/\s/.test(charset)) {
        list.push({
          id: 'charset-spaces',
          message: 'Charset contains whitespace. Hydra treats spaces as literal characters.',
          fix: {
            label: 'Remove spaces',
            action: 'set-charset',
            payload: charset.replace(/\s+/g, ''),
          },
        });
      }
      const deduped = Array.from(new Set(charset.split(''))).join('');
      if (deduped.length !== charset.length) {
        list.push({
          id: 'charset-duplicates',
          message: 'Charset repeats characters. Duplicate symbols slow down generation.',
          fix: {
            label: 'Remove duplicates',
            action: 'set-charset',
            payload: deduped,
          },
        });
      }
    }

    if (selectedUserList) {
      const blankCount = userLines.filter((line) => !line).length;
      if (blankCount > 0) {
        list.push({
          id: 'user-blanks',
          message: `${selectedUserList.name} has empty lines. Hydra will skip them but it is clearer to remove them.`,
          fix: {
            label: 'Strip blanks',
            action: 'replace-user-list',
            payload: buildUniqueList(selectedUserList.content),
          },
        });
      }
      const unique = buildUniqueList(selectedUserList.content);
      const uniqueCount = unique ? unique.split('\n').length : 0;
      const originalCount = userLines.filter((line) => line).length;
      if (uniqueCount < originalCount) {
        list.push({
          id: 'user-duplicates',
          message: `${selectedUserList.name} contains duplicate usernames.`,
          fix: {
            label: 'Remove duplicates',
            action: 'replace-user-list',
            payload: unique,
          },
        });
      }
    }

    if (selectedPassList) {
      const blankCount = passLines.filter((line) => !line).length;
      if (blankCount > 0) {
        list.push({
          id: 'pass-blanks',
          message: `${selectedPassList.name} has blank entries that waste attempts.`,
          fix: {
            label: 'Strip blanks',
            action: 'replace-pass-list',
            payload: buildUniqueList(selectedPassList.content),
          },
        });
      }
      const unique = buildUniqueList(selectedPassList.content);
      const uniqueCount = unique ? unique.split('\n').length : 0;
      const originalCount = passLines.filter((line) => line).length;
      if (uniqueCount < originalCount) {
        list.push({
          id: 'pass-duplicates',
          message: `${selectedPassList.name} repeats passwords.`,
          fix: {
            label: 'Remove duplicates',
            action: 'replace-pass-list',
            payload: unique,
          },
        });
      }
    }

    return list;
  }, [
    target,
    trimmedTarget,
    rule,
    charset,
    selectedUserList,
    selectedPassList,
    userLines,
    passLines,
  ]);

  const redactionHints = useMemo<RedactionHint[]>(() => {
    const hints: RedactionHint[] = [];

    if (trimmedTarget && (ipv4.test(trimmedTarget.split(':')[0]) || domainLike.test(trimmedTarget))) {
      hints.push({
        field: 'target',
        message: 'Target looks like a real host. Exported configs will replace it with <redacted>.',
      });
    }

    if (selectedUserList) {
      const flaggedUser = userLines.find((line) => {
        if (!line) return false;
        if (emailPattern.test(line)) return true;
        if (benignUsernames.has(line.toLowerCase())) return false;
        return /\d/.test(line) || line.length > 8;
      });
      if (flaggedUser) {
        hints.push({
          field: 'userList',
          message: `${selectedUserList.name} appears to contain real usernames. They will be redacted on export.`,
        });
      }
    }

    if (selectedPassList) {
      const flaggedPass = passLines.find((line) => line && line.length > 6 && /[A-Z@!\d]/.test(line));
      if (flaggedPass) {
        hints.push({
          field: 'passList',
          message: `${selectedPassList.name} includes sensitive passwords. They will export as <redacted>.`,
        });
      }
    }

    return hints;
  }, [trimmedTarget, selectedUserList, selectedPassList, userLines, passLines]);

  useEffect(() => {
    if (!onRedactionChange) return;
    onRedactionChange(redactionHints.map((hint) => hint.field));
  }, [redactionHints, onRedactionChange]);

  return (
    <div className="mt-3 bg-gray-800 border border-gray-700 rounded p-3 text-sm">
      <div className="flex items-center gap-2">
        <img
          src="/themes/Yaru/status/dialog-warning-symbolic.svg"
          alt="hygiene assistant"
          className="w-4 h-4"
        />
        <h3 className="uppercase tracking-wide text-xs text-gray-300">
          Input hygiene assistant
        </h3>
      </div>
      {issues.length ? (
        <ul className="mt-2 space-y-2">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-2 text-yellow-200">
                <span aria-hidden="true">⚠️</span>
                <span data-testid="hydra-hygiene-warning">{issue.message}</span>
              </div>
              {issue.fix && onFix && (
                <button
                  type="button"
                  onClick={() => onFix(issue.fix!)}
                  className="self-start rounded bg-yellow-500 px-2 py-1 text-xs font-semibold text-black hover:bg-yellow-400"
                >
                  {issue.fix.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-green-300" data-testid="hydra-hygiene-ok">
          All inputs look clean.
        </p>
      )}

      {redactionHints.length > 0 && (
        <div className="mt-3 border-t border-gray-700 pt-2">
          <h4 className="text-xs uppercase text-gray-400">Redaction hints</h4>
          <ul className="mt-1 space-y-1 text-blue-200">
            {redactionHints.map((hint) => (
              <li key={hint.field} className="text-xs">
                {hint.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Hygiene;
