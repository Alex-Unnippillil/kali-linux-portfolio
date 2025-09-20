import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import FindOverlay, { HIGHLIGHT_CLASS } from '../apps/terminal/FindOverlay';

describe('Terminal find overlay', () => {
  const setup = () =>
    render(
      <div>
        <div className="term-line">alpha entry</div>
        <div className="term-line">beta entry</div>
        <FindOverlay />
      </div>,
    );

  it('toggles the overlay with Ctrl+F', () => {
    const { queryByPlaceholderText } = setup();

    expect(queryByPlaceholderText('Find...')).toBeNull();

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(queryByPlaceholderText('Find...')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(queryByPlaceholderText('Find...')).toBeNull();
  });

  it('clears highlights when the query is emptied', () => {
    const { container, getByPlaceholderText } = setup();
    const [firstLine, secondLine] = container.querySelectorAll('.term-line');

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    const input = getByPlaceholderText('Find...') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'alpha' } });
    expect(firstLine?.classList.contains(HIGHLIGHT_CLASS)).toBe(true);
    expect(secondLine?.classList.contains(HIGHLIGHT_CLASS)).toBe(false);

    fireEvent.change(input, { target: { value: '' } });
    expect(firstLine?.classList.contains(HIGHLIGHT_CLASS)).toBe(false);
    expect(secondLine?.classList.contains(HIGHLIGHT_CLASS)).toBe(false);
  });
});
