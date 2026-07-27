import {
  diffArray,
  diffJson,
  diffText,
  runDiff,
  DiffWorkerPool,
  type DiffWorkerRequestMessage,
  type DiffWorkerResponseMessage,
} from '../utils/diff';

class FakeWorker {
  public onmessage: ((event: MessageEvent<DiffWorkerResponseMessage>) => void) | null = null;

  public onerror: ((event: ErrorEvent) => void) | null = null;

  public terminated = false;

  public messages: DiffWorkerRequestMessage[] = [];

  private cancelled = new Set<string>();

  constructor(private readonly delay = 10) {}

  postMessage(message: DiffWorkerRequestMessage) {
    if (this.terminated) return;
    if (message.type === 'cancel') {
      this.cancelled.add(message.id);
      return;
    }
    this.messages.push(message);
    if (message.type === 'diff') {
      const response: DiffWorkerResponseMessage = {
        id: message.id,
        status: 'success',
        mode: message.mode,
        result: runDiff(message.mode, message.payload as never),
      };
      setTimeout(() => {
        if (this.terminated || this.cancelled.has(message.id)) return;
        this.onmessage?.({ data: response } as MessageEvent<DiffWorkerResponseMessage>);
      }, this.delay);
    }
  }

  terminate() {
    this.terminated = true;
  }
}

describe('diffText', () => {
  it('computes inserts and deletes for inline changes', () => {
    const diff = diffText('kali', 'kali linux');
    const insertSegment = diff.find(segment => segment.type === 'insert');
    expect(insertSegment?.text).toBe(' linux');
    const equalText = diff.filter(segment => segment.type === 'equal').map(segment => segment.text).join('');
    expect(equalText).toBe('kali');
  });
});

describe('diffJson', () => {
  it('detects added, removed, and changed properties', () => {
    const left = { user: { name: 'alex', role: 'user' }, enabled: false, legacy: true };
    const right = { user: { name: 'alex', role: 'admin' }, enabled: true, plan: 'pro' };
    const diff = diffJson(left, right);
    const kinds = diff.map(change => change.kind);
    expect(kinds).toContain('changed');
    expect(kinds).toContain('added');
    expect(kinds).toContain('removed');
    const roleChange = diff.find(change => change.path.join('.') === 'user.role');
    expect(roleChange?.before).toBe('user');
    expect(roleChange?.after).toBe('admin');
  });
});

describe('diffArray', () => {
  it('records element-level differences', () => {
    const left = [1, 2, 3];
    const right = [1, 4, 3, 5];
    const diff = diffArray(left, right);
    const added = diff.filter(change => change.kind === 'added');
    const changed = diff.filter(change => change.kind === 'changed');
    expect(added).toHaveLength(1);
    expect(added[0]?.path).toEqual([3]);
    expect(changed).toHaveLength(1);
    expect(changed[0]?.path).toEqual([1]);
    expect(changed[0]?.before).toBe(2);
    expect(changed[0]?.after).toBe(4);
  });
});

describe('DiffWorkerPool', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('rejects with AbortError when cancelling an in-flight job', async () => {
    const workers: FakeWorker[] = [];
    const pool = new DiffWorkerPool({
      size: 1,
      createWorker: () => {
        const worker = new FakeWorker(25);
        workers.push(worker);
        return worker as unknown as Worker;
      },
    });

    const controller = new AbortController();
    const promise = pool.run('text', { left: 'a', right: 'b' }, controller.signal);
    controller.abort();

    await expect(promise).rejects.toHaveProperty('name', 'AbortError');
    expect(workers[0]?.terminated).toBe(true);
  });

  it('removes queued jobs when cancelled before execution', async () => {
    const worker = new FakeWorker(50);
    const pool = new DiffWorkerPool({
      size: 1,
      createWorker: () => worker as unknown as Worker,
    });

    const first = pool.run('text', { left: 'foo', right: 'bar' });
    const controller = new AbortController();
    const secondPromise = pool.run('text', { left: 'hello', right: 'world' }, controller.signal);
    controller.abort();

    await expect(secondPromise).rejects.toHaveProperty('name', 'AbortError');

    jest.advanceTimersByTime(60);
    await expect(first).resolves.toEqual({
      kind: 'text',
      segments: expect.any(Array),
    });

    expect(worker.messages.filter(message => message.type === 'diff')).toHaveLength(1);
  });
});
