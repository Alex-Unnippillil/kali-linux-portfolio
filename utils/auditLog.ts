import type { RedactionCategory } from './redaction';

export type RedactionAuditAction = 'redact' | 'reveal' | 'peek';

export interface RedactionAuditEvent {
  type: 'redaction';
  category: RedactionCategory;
  action: RedactionAuditAction;
  context: string;
  timestamp: string;
}

const auditTrail: RedactionAuditEvent[] = [];

export const logRedactionAudit = (
  event: Omit<RedactionAuditEvent, 'timestamp'>,
): RedactionAuditEvent => {
  const entry: RedactionAuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  auditTrail.push(entry);
  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info('[audit]', entry);
  }
  return entry;
};

export const getAuditTrail = (): RedactionAuditEvent[] => [...auditTrail];

export const clearAuditTrail = (): void => {
  auditTrail.length = 0;
};
