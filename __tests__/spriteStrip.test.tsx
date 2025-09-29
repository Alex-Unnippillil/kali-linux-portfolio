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

  test('zoom slider scales the preview', () => {
    const { getByTestId, getByLabelText } = render(
      <SpriteStripPreview src="foo.png" frameWidth={10} frameHeight={10} frames={3} fps={10} />,
    );
    const el = getByTestId('sprite-strip-preview');
    const slider = getByLabelText('Zoom') as HTMLInputElement;

    expect(slider.value).toBe('100');
    expect(el).toHaveStyle('transform: scale(1)');

    fireEvent.change(slider, { target: { value: '150' } });

    expect(slider.value).toBe('150');
    expect(el).toHaveStyle('transform: scale(1.5)');
  });
});
