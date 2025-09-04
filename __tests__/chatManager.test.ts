import { getChatId } from '../src/chat/chatManager';

describe('getChatId', () => {
  it('returns undefined when chat is missing', () => {
    expect(getChatId(undefined as any)).toBeUndefined();
  });
});
