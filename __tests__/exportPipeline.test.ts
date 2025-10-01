import ExportPipeline, {
  ExportJobRequest,
  ExportSnapshot,
  ExportTask,
} from '../utils/exports/pipeline';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const waitForSnapshot = async (
  pipeline: ExportPipeline,
  predicate: (snapshot: ExportSnapshot) => boolean,
  attempts = 10,
) => {
  let snapshot = pipeline.getSnapshot();
  for (let i = 0; i < attempts; i += 1) {
    if (predicate(snapshot)) return snapshot;
    await flush();
    snapshot = pipeline.getSnapshot();
  }
  return snapshot;
};

describe('ExportPipeline', () => {
  it('processes queued exports sequentially and updates history', async () => {
    const history: ExportTask[][] = [];
    const pipeline = new ExportPipeline({
      onHistoryChange: (next) => {
        history.push(next);
      },
    });

    let resolveJobA: ((result: { bytesWritten: number }) => void) | undefined;
    let resolveJobB: ((result: { bytesWritten: number }) => void) | undefined;

    const jobA: ExportJobRequest = {
      label: 'Recon export',
      source: 'reports/recon',
      start: () =>
        new Promise((resolve) => {
          resolveJobA = resolve;
        }),
    };

    const jobB: ExportJobRequest = {
      label: 'Loot export',
      source: 'reports/loot',
      start: () =>
        new Promise((resolve) => {
          resolveJobB = resolve;
        }),
    };

    const idA = pipeline.queueExport(jobA);
    const idB = pipeline.queueExport(jobB);

    const queueSnapshot = await waitForSnapshot(
      pipeline,
      (snapshot) =>
        snapshot.active.some(
          (task) => task.id === idA && task.status === 'running',
        ) &&
        snapshot.active.some((task) => task.id === idB && task.status === 'queued'),
    );

    expect(queueSnapshot.active.find((task) => task.id === idA)?.status).toBe('running');
    expect(
      queueSnapshot.active.some((task) => task.id === idB && task.status === 'queued'),
    ).toBe(true);

    resolveJobA?.({ bytesWritten: 2_048 });

    const afterFirst = await waitForSnapshot(
      pipeline,
      (snapshot) =>
        snapshot.completed.some(
          (task) => task.id === idA && task.status === 'completed',
        ) &&
        snapshot.active.some((task) => task.id === idB && task.status === 'running'),
    );

    expect(
      afterFirst.completed.find((task) => task.id === idA)?.status,
    ).toBe('completed');
    expect(
      afterFirst.active.find((task) => task.id === idB)?.status,
    ).toBe('running');

    resolveJobB?.({ bytesWritten: 1_024 });

    const finalSnapshot = await waitForSnapshot(
      pipeline,
      (snapshot) =>
        snapshot.active.length === 0 &&
        snapshot.completed.length === 2 &&
        snapshot.completed.every((task) => task.status === 'completed'),
    );

    expect(finalSnapshot.active).toHaveLength(0);
    expect(finalSnapshot.completed).toHaveLength(2);
    expect(history.at(-1)?.map((entry) => entry.id)).toEqual([idB, idA]);
  });

  it('supports cancelling and resuming resumable exports', async () => {
    const cleanupCalls: string[][] = [];
    const pipeline = new ExportPipeline();

    let cancelCalled = false;
    const job: ExportJobRequest = {
      label: 'Forensics package',
      source: 'cases/alpha',
      resumable: true,
      start: ({ updateProgress, setResumeToken, signal }) => {
        updateProgress({ bytesTotal: 4_000, bytesCompleted: 2_000, tempFiles: ['tmp-1'] });
        setResumeToken('resume-token');
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            const abortError = new Error('aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
          // Wait for resume or cancel
        });
      },
      resume: ({ updateProgress, getJob }) => {
        const snapshot = getJob();
        expect(snapshot.resumeToken).toBe('resume-token');
        updateProgress({ bytesCompleted: 4_000 });
        return Promise.resolve({ bytesWritten: 4_096, redactions: ['credentials'] });
      },
      cancel: () => {
        cancelCalled = true;
        return Promise.resolve();
      },
      cleanup: async (task) => {
        cleanupCalls.push([...task.tempFiles]);
      },
    };

    const exportId = pipeline.queueExport(job);
    await flush();

    await pipeline.cancelExport(exportId);

    const cancelledSnapshot = await waitForSnapshot(
      pipeline,
      (snapshot) =>
        snapshot.completed.some(
          (task) => task.id === exportId && task.status === 'cancelled',
        ),
    );

    expect(cancelCalled).toBe(true);
    expect(cleanupCalls).toEqual([['tmp-1']]);

    const cancelled = cancelledSnapshot.completed.find((task) => task.id === exportId);
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.tempFiles).toHaveLength(0);

    const resumed = await pipeline.resumeExport(exportId);
    expect(resumed).toBe(true);

    const runningSnapshot = await waitForSnapshot(
      pipeline,
      (snapshot) =>
        snapshot.active.some(
          (task) => task.id === exportId && task.status === 'running',
        ),
    );

    expect(runningSnapshot.active.find((task) => task.id === exportId)?.status).toBe(
      'running',
    );

    const snapshot = await waitForSnapshot(
      pipeline,
      (next) =>
        next.completed.some(
          (task) => task.id === exportId && task.status === 'completed',
        ),
    );

    const completed = snapshot.completed.find((task) => task.id === exportId);
    expect(completed).toBeDefined();
    expect(completed?.status).toBe('completed');
    expect(completed?.redactions).toEqual(['credentials']);
    expect(completed?.result?.bytesWritten).toBe(4_096);
  });
});
