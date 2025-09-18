import { getChatId } from '../src/chat/chatManager';
import { clearAppLogBuffer, createLogger } from '../lib/logger';

describe('getChatId', () => {
  afterEach(() => {
    clearAppLogBuffer('chat-test');
  });

  it('throws and logs when chat is undefined', () => {
    const logger = createLogger({ correlationId: 'test', appId: 'chat-test' });
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => getChatId(undefined as any, logger)).toThrow('chat is required');
    expect(spy).toHaveBeenCalled();
    const log = JSON.parse((spy.mock.calls[0] as any)[0]);
    expect(log.level).toBe('error');
    expect(log.message).toBe('chat is required');
    spy.mockRestore();

  });
});
