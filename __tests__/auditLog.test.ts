import {
  appendAuditEvent,
  clearAuditLog,
  exportAuditLog,
  getAuditLog,
  importAuditLog,
  verifyAuditLog,
} from '../utils/auditLog';
import {
  getAuditLogOptIn,
  setAuditLogOptIn,
} from '../utils/settingsStore';

describe('audit log utilities', () => {
  beforeEach(async () => {
    await clearAuditLog();
    localStorage.clear();
  });

  it('respects opt-in state before recording', async () => {
    const initialOptIn = await getAuditLogOptIn();
    expect(initialOptIn).toBe(false);

    const noEntry = await appendAuditEvent({
      actor: 'tester',
      action: 'no-log',
      payload: { ok: true },
    });
    expect(noEntry).toBeNull();

    await setAuditLogOptIn(true);
    const entry = await appendAuditEvent({
      actor: 'tester',
      action: 'record',
      payload: { ok: true },
    });
    expect(entry).not.toBeNull();

    const storedOptIn = await getAuditLogOptIn();
    expect(storedOptIn).toBe(true);

    const log = await getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0]?.payloadHash).toBeTruthy();
  });

  it('detects tampering via integrity report', async () => {
    await setAuditLogOptIn(true);
    await appendAuditEvent({
      actor: 'analyst',
      action: 'simulate-action',
      payload: { target: 'lab', status: 'ok' },
    });
    const log = await getAuditLog();
    const report = await verifyAuditLog(log);
    expect(report.valid).toBe(true);

    const tampered = log.map((entry, index) =>
      index === 0
        ? { ...entry, payload: { ...entry.payload, status: 'tampered' } }
        : entry,
    );
    const tamperedReport = await verifyAuditLog(tampered);
    expect(tamperedReport.valid).toBe(false);
    expect(tamperedReport.issues[0]?.reason).toMatch(/hash/i);
  });

  it('round-trips through export and import with integrity preserved', async () => {
    await setAuditLogOptIn(true);
    await appendAuditEvent({
      actor: 'analyst',
      action: 'first',
      payload: { detail: 1 },
    });
    await appendAuditEvent({
      actor: 'analyst',
      action: 'second',
      payload: { detail: 2 },
    });

    const exported = await exportAuditLog();
    await clearAuditLog();

    const result = await importAuditLog(exported);
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.report.valid).toBe(true);

    const importedLog = await getAuditLog();
    expect(importedLog).toHaveLength(2);
    const verifyResult = await verifyAuditLog(importedLog);
    expect(verifyResult.valid).toBe(true);
  });
});

