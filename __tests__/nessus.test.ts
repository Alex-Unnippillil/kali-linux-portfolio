import { loadJobDefinitions, saveJobDefinition, loadFalsePositives, recordFalsePositive } from '../components/apps/nessus/storage';

describe('nessus scheduling and feedback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('job definitions persist in localStorage', () => {
    saveJobDefinition({ scanId: '1', schedule: 'daily' });
    expect(loadJobDefinitions()).toEqual([{ scanId: '1', schedule: 'daily' }]);
  });

  test('false positive submissions stored', () => {
    recordFalsePositive('finding-2', 'sample reason');
    expect(loadFalsePositives()).toEqual([
      { findingId: 'finding-2', reason: 'sample reason' },
    ]);
  });
});
