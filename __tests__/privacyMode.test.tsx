import { renderHook, act } from '@testing-library/react';
import { PrivacyModeProvider, usePrivacyMode } from '../hooks/usePrivacyMode';
import { PRIVACY_CONSTANTS } from '../utils/privacyMode';

describe('privacy mode', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="sensitive" data-privacy="sensitive">Secret note</section>
      <div id="avatar" data-privacy="sensitive" data-privacy-avatar="true"><span>Avatar</span></div>
      <p id="whitelisted" data-privacy="sensitive" data-privacy-whitelist="true">Public blurb</p>
    `;
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
  });

  test('applies masking styles when enabled', () => {
    const { result } = renderHook(() => usePrivacyMode(), {
      wrapper: PrivacyModeProvider,
    });

    act(() => {
      result.current.setEnabled(true);
    });

    const root = document.documentElement.classList;
    expect(root.contains(PRIVACY_CONSTANTS.PRIVACY_MODE_ARMED_CLASS)).toBe(true);
    expect(root.contains(PRIVACY_CONSTANTS.PRIVACY_MODE_CLASS)).toBe(true);
    expect(document.getElementById('sensitive')?.dataset.privacyHidden).toBe('true');
    expect(document.getElementById('avatar')?.dataset.privacyAvatarHidden).toBe('true');
    expect(document.getElementById('whitelisted')?.dataset.privacyHidden).toBeUndefined();
  });

  test('unhide temporarily restores content before reapplying', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => usePrivacyMode(), {
      wrapper: PrivacyModeProvider,
    });

    act(() => {
      result.current.setEnabled(true);
    });

    act(() => {
      result.current.revealTemporarily();
    });

    expect(document.documentElement.classList.contains(PRIVACY_CONSTANTS.PRIVACY_MODE_CLASS)).toBe(false);
    expect(document.getElementById('sensitive')?.dataset.privacyHidden).toBeUndefined();

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(document.documentElement.classList.contains(PRIVACY_CONSTANTS.PRIVACY_MODE_CLASS)).toBe(true);
    expect(document.getElementById('sensitive')?.dataset.privacyHidden).toBe('true');
    jest.useRealTimers();
  });

  test('masks dynamically inserted sensitive elements', async () => {
    const { result } = renderHook(() => usePrivacyMode(), {
      wrapper: PrivacyModeProvider,
    });

    act(() => {
      result.current.setEnabled(true);
    });

    const dynamic = document.createElement('div');
    dynamic.dataset.privacy = 'sensitive';
    dynamic.id = 'dynamic';
    document.body.appendChild(dynamic);

    await act(async () => {
      await Promise.resolve();
    });

    expect(document.getElementById('dynamic')?.dataset.privacyHidden).toBe('true');
  });
});

