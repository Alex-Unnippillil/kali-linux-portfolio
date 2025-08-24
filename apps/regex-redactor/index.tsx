import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Regex Redactor',
  description:
    'Redact sensitive data using vetted patterns with masking preview and export options',
};
export {
  default,
  displayRegexRedactor,
  SAFE_PATTERNS,
} from '../../components/apps/regex-redactor';
