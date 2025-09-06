import osdService from '../utils/osdService';

jest.useFakeTimers();

describe('osdService', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  test('shows and hides message after duration', () => {
    osdService.show('Hello', 1200);
    const node = document.querySelector('[data-osd]');
    expect(node?.textContent).toBe('Hello');
    jest.advanceTimersByTime(1200);
    expect(document.querySelector('[data-osd]')).toBeNull();
  });

  test('suppresses message when Do Not Disturb is enabled', () => {
    window.localStorage.setItem('notifications-dnd', 'true');
    osdService.show('Quiet', 1200);
    expect(document.querySelector('[data-osd]')).toBeNull();
  });
});
