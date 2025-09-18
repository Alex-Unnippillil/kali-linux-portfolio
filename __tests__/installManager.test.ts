import {
  clearAllInstallSnapshots,
  getInstallJobs,
  loadStoredInstallJobs,
  resetInstallManager,
  resumeInstallJob,
  startInstallJob,
} from '../utils/installManager';
import { loadInstallSnapshots } from '../utils/safeStorage';

describe('installManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetInstallManager();
    clearAllInstallSnapshots();
    localStorage.clear();
  });

  afterEach(() => {
    resetInstallManager();
    clearAllInstallSnapshots();
    jest.useRealTimers();
  });

  test('stores snapshots and resumes installs', () => {
    startInstallJob('demo', ['demo-core', 'demo-ui']);

    jest.advanceTimersByTime(650);

    let jobs = getInstallJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].completedPackages).toHaveLength(1);

    let snapshots = loadInstallSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].completedPackages).toHaveLength(1);

    resetInstallManager();

    const restored = loadStoredInstallJobs();
    expect(restored).toHaveLength(1);
    expect(restored[0].completedPackages).toHaveLength(1);
    expect(restored[0].active).toBe(false);

    resumeInstallJob('demo');
    jest.runAllTimers();

    jobs = getInstallJobs();
    expect(jobs[0].phase).toBe('completed');
    snapshots = loadInstallSnapshots();
    expect(snapshots).toHaveLength(0);
  });
});
