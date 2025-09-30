import { fireEvent, render } from '@testing-library/react';
import { act } from 'react';
import SpriteStripPreview from '../components/SpriteStripPreview';
import { importSpriteStrip, clearSpriteStripCache } from '../utils/spriteStrip';

jest.useFakeTimers();

describe('sprite strip utilities', () => {
  test('imports strips with caching', () => {
    clearSpriteStripCache();
    const img1 = importSpriteStrip('foo.png');
    const img2 = importSpriteStrip('foo.png');
    expect(img1).toBe(img2);
  });

  test('preview advances frames', () => {
    const { getByTestId } = render(
      <SpriteStripPreview src="foo.png" frameWidth={10} frameHeight={10} frames={3} fps={10} />,
    );
    const el = getByTestId('sprite-strip-preview');
    expect(el).toBeTruthy();
    expect(el).toHaveStyle('background-position: 0px 0px');
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(el).toHaveStyle('background-position: -10px 0px');
  });

  test('grid overlay toggles on demand', () => {
    const { getByRole, queryByTestId } = render(
      <SpriteStripPreview src="foo.png" frameWidth={16} frameHeight={16} frames={3} fps={10} />,
    );

    expect(queryByTestId('sprite-strip-grid')).toBeNull();

    const toggle = getByRole('button', { name: /show grid/i });
    fireEvent.click(toggle);
    expect(queryByTestId('sprite-strip-grid')).toBeTruthy();

    fireEvent.click(toggle);
    expect(queryByTestId('sprite-strip-grid')).toBeNull();
  });

  test('keyboard shortcuts adjust zoom and reset', () => {
    const { getByTestId } = render(
      <SpriteStripPreview src="foo.png" frameWidth={10} frameHeight={10} frames={3} fps={10} />,
    );

    const el = getByTestId('sprite-strip-preview');
    expect(el).toHaveStyle('transform: scale(1)');

    fireEvent.keyDown(window, { key: '+', ctrlKey: true });
    expect(el).toHaveStyle('transform: scale(1.25)');

    fireEvent.keyDown(window, { key: '-', ctrlKey: true });
    expect(el).toHaveStyle('transform: scale(1)');

    fireEvent.keyDown(window, { key: '0', ctrlKey: true });
    expect(el).toHaveStyle('transform: scale(1)');
  });
});
