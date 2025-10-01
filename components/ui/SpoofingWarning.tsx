import React from 'react';
import { SanitizeTextResult } from '../../utils/sanitizeText';

interface SpoofingWarningProps {
  result: SanitizeTextResult;
  className?: string;
}

const SpoofingWarning: React.FC<SpoofingWarningProps> = ({ result, className = '' }) => {
  if (!result.issues.length) return null;
  return (
    <div
      role="status"
      className={`mt-2 space-y-1 rounded border border-yellow-400 bg-yellow-500/10 p-2 text-xs text-yellow-200 ${className}`.trim()}
    >
      {result.warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
      {result.safe !== result.original && (
        <p>
          Suggested normalization:{' '}
          <code className="break-all text-yellow-100">{result.safe}</code>
        </p>
      )}
    </div>
  );
};

export default SpoofingWarning;
