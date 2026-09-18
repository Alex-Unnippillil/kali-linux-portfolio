import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WindowEditButtons } from '../components/base/window';

describe('native window control activation', () => {
  const setup = () => {
    const maximize = jest.fn();
    const titleDoubleClick = jest.fn();
    render(<div onDoubleClick={titleDoubleClick}><WindowEditButtons id="test" maximize={maximize} /></div>);
    return { maximize, titleDoubleClick, button: screen.getByRole('button', { name: 'Window maximize' }) };
  };

  it('does not activate on pointerup before the browser dispatches click', () => {
    const { maximize, button } = setup();
    fireEvent.pointerDown(button, { pointerId: 1, pointerType: 'mouse', button: 0 });
    fireEvent.pointerUp(button, { pointerId: 1, pointerType: 'mouse', button: 0 });
    expect(maximize).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(maximize).toHaveBeenCalledTimes(1);
  });

  it('does not double-toggle when focus moves between pointerup and click', () => {
    const { maximize, button } = setup();
    fireEvent.pointerDown(button, { pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(button, { pointerId: 1, pointerType: 'touch' });
    fireEvent.blur(button);
    fireEvent.click(button);
    expect(maximize).toHaveBeenCalledTimes(1);
  });

  it('retains keyboard and assistive-technology click activation', () => {
    const { maximize, button } = setup();
    fireEvent.click(button, { detail: 0 });
    expect(maximize).toHaveBeenCalledTimes(1);
  });

  it('never bubbles a control double-click into title-bar maximize', () => {
    const { titleDoubleClick, button } = setup();
    fireEvent.doubleClick(button);
    expect(titleDoubleClick).not.toHaveBeenCalled();
  });
});
