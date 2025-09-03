import { getChatId } from '../src/chat/chatManager';

describe('getChatId', () => {
  it('throws when chat is undefined', () => {
    expect(() => getChatId(undefined as any)).toThrow('chat is required');
  });
});
