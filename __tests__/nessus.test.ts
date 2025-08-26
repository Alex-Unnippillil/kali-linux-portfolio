import { loadJobDefinitions, saveJobDefinition, loadFalsePositives, recordFalsePositive } from '../components/apps/nessus/index';

describe('nessus scheduling and feedback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('job definitions persist in localStorage', () => {
    saveJobDefinition({ scanId: '1', schedule: 'daily' });
    expect(loadJobDefinitions()).toEqual([{ scanId: '1', schedule: 'daily' }]);
  });

  test('false positive submissions stored', () => {
    recordFalsePositive('2', 'sample reason');
    expect(loadFalsePositives()).toEqual([{ scanId: '2', reason: 'sample reason' }]);
  });
});
