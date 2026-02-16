import {
  loadJobDefinitions,
  saveJobDefinition,
  loadFalsePositives,
  upsertFalsePositive,
  removeFalsePositive,
} from '../components/apps/nessus/index';

describe('nessus scheduling and false positive storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('job definitions persist in localStorage', () => {
    saveJobDefinition({ scanId: '1', schedule: 'daily' });
    expect(loadJobDefinitions()).toEqual([{ scanId: '1', schedule: 'daily' }]);
  });

  test('false positive upsert updates by finding key instead of appending duplicates', () => {
    upsertFalsePositive('10.0.0.1::100', '100', 'first reason');
    upsertFalsePositive('10.0.0.1::100', '100', 'updated reason');

    expect(loadFalsePositives()).toEqual([
      { findingKey: '10.0.0.1::100', findingId: '100', reason: 'updated reason' },
    ]);
  });

  test('false positive remove unmarks by finding key', () => {
    upsertFalsePositive('10.0.0.1::100', '100', 'reason');
    upsertFalsePositive('10.0.0.2::100', '100', 'other reason');

    removeFalsePositive('10.0.0.1::100');

    expect(loadFalsePositives()).toEqual([
      { findingKey: '10.0.0.2::100', findingId: '100', reason: 'other reason' },
    ]);
  });

  test('loading false positives remains backward compatible with old storage format', () => {
    localStorage.setItem(
      'nessusFalsePositives',
      JSON.stringify([{ findingId: 'legacy-plugin-id', reason: 'legacy reason' }])
    );

    expect(loadFalsePositives()).toEqual([
      { findingKey: undefined, findingId: 'legacy-plugin-id', reason: 'legacy reason' },
    ]);
  });
});
