describe('logger', () => {
  let errorSpy: jest.SpyInstance;

  const loadLogger = async () => {
    jest.resetModules();
    const module = await import('@/utils/logger');
    return module.default;
  };

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs a message once and deduplicates subsequent calls', async () => {
    const logger = await loadLogger();
    const payload = { message: 'duplicate', code: 500 };

    logger.error('Failure', payload);
    logger.error('Failure', payload);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Failure', payload);
  });

  it('stringifies circular structures without throwing', async () => {
    const logger = await loadLogger();
    const circular: Record<string, unknown> & { self?: unknown } = { foo: 'bar' };
    circular.self = circular;

    expect(() => logger.error('Circular', circular)).not.toThrow();
    logger.error('Circular', circular);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('uses the same error instance to avoid double logging', async () => {
    const logger = await loadLogger();
    const err = new Error('boom');

    logger.error(err);
    logger.error(err);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(err);
  });
});
