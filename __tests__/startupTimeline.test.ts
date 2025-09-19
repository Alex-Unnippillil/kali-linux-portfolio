describe('startupTimeline helpers', () => {
  const loadTimeline = async () => {
    jest.resetModules();
    const mod = await import('../lib/startupTimeline');
    mod.__unsafeClearTimeline();
    delete (window as any).__STARTUP_TIMELINE__;
    return mod;
  };

  it('records marks with relative offsets', async () => {
    const timeline = await loadTimeline();
    const nowSpy = jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(160);

    timeline.markPhase('boot:init');
    timeline.markPhase('boot:interactive');
    nowSpy.mockRestore();

    const entries = timeline.getTimeline();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      phase: 'boot:init',
      timestamp: 100,
      sinceStart: 0,
      sincePrevious: 0,
    });
    expect(entries[1].phase).toBe('boot:interactive');
    expect(entries[1].timestamp).toBe(160);
    expect(entries[1].sinceStart).toBeCloseTo(60, 5);
    expect(entries[1].sincePrevious).toBeCloseTo(60, 5);
  });

  it('serialises the timeline to CSV', async () => {
    const timeline = await loadTimeline();
    const nowSpy = jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25);

    timeline.markPhase('boot:init');
    timeline.markPhase('boot:first-paint');
    nowSpy.mockRestore();

    const csv = timeline.toCsv();
    const lines = csv.split('\n');
    expect(lines[0]).toBe('phase,timestamp_ms,since_start_ms,since_previous_ms,metadata');
    expect(lines[1]).toContain('boot:init');
    expect(lines[2]).toContain('boot:first-paint');
    expect(lines[2]).toContain('15.00');
  });

  it('exposes the timeline on window for devtools', async () => {
    const timeline = await loadTimeline();
    const nowSpy = jest.spyOn(performance, 'now').mockReturnValue(5);

    timeline.markPhase('boot:init');
    nowSpy.mockRestore();

    const payload = window.__STARTUP_TIMELINE__;
    expect(payload).toBeDefined();
    expect(payload?.entries.length).toBeGreaterThanOrEqual(1);
    expect(payload?.entries[0].phase).toBe('boot:init');
    expect(payload?.marks[0].phase).toBe('boot:init');
  });
});
