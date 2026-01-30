import { renderHook } from '@testing-library/react';
import useSavedTweets from '../../apps/x/state/savedTweets';

describe('useSavedTweets', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).crypto = {
      randomUUID: jest.fn(() => 'generated-id'),
    };
  });

  it('migrates legacy scheduled and published tweets', () => {
    localStorage.setItem(
      'x-thread-published',
      JSON.stringify([
        { id: '123', text: '<b>hi</b>', time: 1700000000000, author: 'LegacyUser' },
      ]),
    );
    localStorage.setItem('x-profile-feed', 'LegacyUser');

    const { result } = renderHook(() => useSavedTweets());
    const [saved] = result.current;

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: '123',
      text: 'hi',
      author: 'LegacyUser',
      timestamp: 1700000000000,
    });
    expect(localStorage.getItem('x-thread-published')).toBeNull();
  });

  it('falls back to empty state when stored data is invalid', () => {
    localStorage.setItem('x-saved-tweets', '"oops"');

    const { result } = renderHook(() => useSavedTweets());
    const [saved] = result.current;

    expect(saved).toEqual([]);
  });
});
