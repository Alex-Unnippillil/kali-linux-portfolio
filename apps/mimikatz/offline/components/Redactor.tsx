'use client';

import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_PLACEHOLDER = '********';

interface RedactionRule {
  pattern: RegExp;
}

const REDACTION_RULES: RedactionRule[] = [
  {
    pattern: /((?:NTLM|NTLMv2|LM)\s*(?:hash)?\s*[:=]\s*)([0-9a-f]{16,})/gi,
  },
  {
    pattern: /((?:SHA1|SHA256|MD5)\s*(?:hash)?\s*[:=]\s*)([0-9a-f]{20,})/gi,
  },
  {
    pattern: /((?:AES(?:128|256)?(?:-CTS-HMAC-SHA1-96)?)\s*(?:key|hash)?\s*[:=]\s*)([0-9a-f]{32,})/gi,
  },
  {
    pattern: /((?:DPAPI|MasterKey|Credential)\s*(?:Key|Secret|Hash)?\s*[:=]\s*)([0-9a-f]{32,})/gi,
  },
  {
    pattern: /((?:Kerberos\s+)?(?:TGT|TGS|Ticket)[^:=\n]*[:=]\s*)([A-Za-z0-9+/=]{20,})/gi,
  },
  {
    pattern: /((?:Token|Secret)\s*[:=]\s*)([A-Fa-f0-9]{16,})/g,
  },
  {
    pattern: /((?:Password|Passphrase)\s*[:=]\s*)(?!\(null\)|<blank>|not set)([^\s]{4,})/gi,
  },
];

export const redactSecrets = (input: string, placeholder = DEFAULT_PLACEHOLDER): string => {
  if (!input) {
    return input;
  }

  return REDACTION_RULES.reduce((text, rule) => {
    return text.replace(rule.pattern, (_, prefix: string) => `${prefix}${placeholder}`);
  }, input);
};

interface RedactorProps {
  initialValue?: string;
  placeholder?: string;
  className?: string;
}

const Redactor: React.FC<RedactorProps> = ({
  initialValue = '',
  placeholder = DEFAULT_PLACEHOLDER,
  className = '',
}) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  const sanitized = useMemo(() => redactSecrets(text, placeholder), [text, placeholder]);
  const preview = isEnabled ? sanitized : text;

  return (
    <section
      className={`bg-ub-dark border border-gray-700 rounded-lg p-4 flex flex-col gap-3 ${className}`.trim()}
      aria-label="Mimikatz dump redactor"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Redaction preview</h2>
          <p className="text-xs text-gray-300">
            Paste Mimikatz output and toggle redaction to review sanitized text.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            className="accent-purple-500 h-4 w-4"
            checked={isEnabled}
            onChange={(event) => setIsEnabled(event.target.checked)}
            aria-label="Toggle redaction"
          />
          Redaction enabled
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        <span className="font-medium">Raw dump</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste mimikatz.log contents here..."
          className="min-h-[160px] w-full rounded border border-gray-700 bg-black/70 p-3 font-mono text-sm text-green-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Raw dump input"
        />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-400">
          {isEnabled ? 'Sanitized preview' : 'Original text'}
        </span>
        <pre
          aria-label="Redactor preview"
          className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-gray-700 bg-black/80 p-3 font-mono text-sm text-green-200"
        >
          {preview || 'Nothing to display'}
        </pre>
      </div>
    </section>
  );
};

export default Redactor;
