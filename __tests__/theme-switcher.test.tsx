import { fireEvent, render, screen } from '@testing-library/react';
import Appearance from '../components/settings/Appearance';
import { getTheme, setTheme } from '../lib/theme-store';

describe('theme switcher', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    window.localStorage.clear();
    setTheme('default');
  });

  test('selecting purple theme persists selection', () => {
    render(<Appearance />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'purple' } });
    expect(document.documentElement.dataset.theme).toBe('purple');
    expect(window.localStorage.getItem('app:theme')).toBe('purple');
    expect(getTheme()).toBe('purple');
  });
});
