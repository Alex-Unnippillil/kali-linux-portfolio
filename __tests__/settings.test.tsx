import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Settings from '../components/apps/settings';

describe('Settings app', () => {
  const renderSettings = () =>
    render(<Settings changeBackgroundImage={() => {}} currBgImgName="wall-1" />);

  beforeEach(() => {
    localStorage.clear();
  });

  test('toggles persist via localStorage', () => {
    const { getByTestId, unmount } = renderSettings();
    const sound = getByTestId('sound-toggle') as HTMLInputElement;
    const motion = getByTestId('motion-toggle') as HTMLInputElement;
    fireEvent.click(sound);
    fireEvent.click(motion);
    expect(sound.checked).toBe(false);
    expect(motion.checked).toBe(true);
    unmount();
    const { getByTestId: getAgain } = renderSettings();
    expect((getAgain('sound-toggle') as HTMLInputElement).checked).toBe(false);
    expect((getAgain('motion-toggle') as HTMLInputElement).checked).toBe(true);
  });

  test('reset clears app state but keeps preferences', () => {
    localStorage.setItem('some-app-state', '1');
    const { getByTestId, queryByText } = renderSettings();
    fireEvent.click(getByTestId('reset-apps'));
    expect(localStorage.getItem('some-app-state')).toBeNull();
    expect(queryByText('App data cleared')).toBeInTheDocument();
  });

  test('import applies preferences', async () => {
    const { getByTestId } = renderSettings();
    const file = new File(
      [JSON.stringify({ sound: false, reducedMotion: true })],
      'prefs.json',
      { type: 'application/json' }
    );
    fireEvent.change(getByTestId('import-input'), { target: { files: [file] } });
    await waitFor(() => {
      expect((getByTestId('sound-toggle') as HTMLInputElement).checked).toBe(false);
      expect((getByTestId('motion-toggle') as HTMLInputElement).checked).toBe(true);
    });
  });
});

