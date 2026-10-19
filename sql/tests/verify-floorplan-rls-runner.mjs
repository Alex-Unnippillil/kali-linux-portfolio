import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// These tests exercise the runner's guards with a fake psql. Actual database
// enforcement is tested separately by the PostgreSQL service in the workflow.
const runner = join(dirname(fileURLToPath(import.meta.url)), 'run-floorplan-rls.sh');
const fakePsql = `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$MOCK_TRACE"
case "$*" in
  *--command=*)
    if [[ ! -f "$MOCK_PREFLIGHT" ]]; then
      touch "$MOCK_PREFLIGHT"
      [[ "$MOCK_MODE" != preflight-error ]] || exit 2
      [[ "$MOCK_MODE" != unsafe ]] && echo t || echo f
    else
      [[ "$MOCK_MODE" != dirty-cleanup ]] && echo t || echo f
    fi
    ;;
  *--file=*enable_floorplan_annotations_rls.sql*)
    case "$MOCK_MODE" in
      unexpected-success) exit 0 ;;
      syntax-error) echo 'ERROR:  42601: syntax error' >&2 ;;
      wrong-relation) echo 'ERROR:  42P01: relation "public.unrelated" does not exist' >&2 ;;
      missing-file) echo 'psql: error: migration file could not be opened' >&2 ;;
      *) echo 'ERROR:  42P01: relation "public.floorplan_annotations" does not exist' >&2 ;;
    esac
    exit 3
    ;;
  *--file=*floorplan_annotations_rls.sql*)
    [[ "$MOCK_MODE" != fixture-error ]] || exit 17
    echo 'fixture ran'
    ;;
  *) echo 'unexpected psql invocation' >&2; exit 99 ;;
esac
`;

function run(mode, disposable = '1') {
  const directory = mkdtempSync(join(tmpdir(), 'portfolio-rls-runner-'));
  try {
    writeFileSync(join(directory, 'psql'), fakePsql, { mode: 0o755 });
    const trace = join(directory, 'trace');
    const result = spawnSync('bash', [runner], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        FLOORPLAN_RLS_DISPOSABLE: disposable,
        MOCK_MODE: mode,
        MOCK_TRACE: trace,
        MOCK_PREFLIGHT: join(directory, 'preflight'),
      },
    });
    let calls = '';
    try { calls = readFileSync(trace, 'utf8'); } catch { /* No psql invocation. */ }
    return { ...result, calls };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('requires explicit disposable opt-in before any database command', () => {
  const result = run('expected', '');
  assert.equal(result.status, 1);
  assert.equal(result.calls, '');
  assert.match(result.stderr, /Refusing to run/);
});

test('rejects nonempty or nonprivileged preflight', () => {
  const result = run('unsafe');
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.calls, /--file=/);
});

test('does not swallow a connection or preflight failure', () => {
  const result = run('preflight-error');
  assert.equal(result.status, 2);
  assert.doesNotMatch(result.calls, /--file=/);
});

test('accepts only the intended undefined-table error, then runs fixture and cleanup', () => {
  const result = run('expected');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: canonical migration fails closed/);
  assert.match(result.stdout, /fixture ran/);
  assert.match(result.stdout, /PASS: disposable fixture cleanup verified/);
  assert.match(result.calls, /--single-transaction/);
});

for (const mode of ['syntax-error', 'wrong-relation', 'missing-file', 'unexpected-success']) {
  test(`rejects ${mode} rather than treating it as the expected migration failure`, () => {
    const result = run(mode);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /fixture ran/);
  });
}

test('propagates a regression fixture failure', () => {
  const result = run('fixture-error');
  assert.equal(result.status, 17);
  assert.doesNotMatch(result.stdout, /cleanup verified/);
});

test('fails if fixture objects survive rollback', () => {
  const result = run('dirty-cleanup');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /fixture objects remain/);
});
