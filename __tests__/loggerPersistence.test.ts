import logger, { setLogLevel, createLogger, getLogLevel } from '../utils/logger';

describe('logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    localStorage.clear();
    setLogLevel('info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('respects log level and persists', () => {
    setLogLevel('error');
    logger.info('hello');
    expect(console.info).not.toHaveBeenCalled();
    logger.error('oops');
    expect(console.error).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('log-level')!)).toBe('error');
    expect(getLogLevel()).toBe('error');
  });

  it('creates prefixed logger', () => {
    const custom = createLogger('prefix');
    custom.info('message');
    expect(console.info).toHaveBeenCalledWith('prefix', 'message');
  });
});
