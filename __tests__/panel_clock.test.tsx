import { render, fireEvent } from '@testing-library/react';
import PanelClock from '../components/util-components/PanelClock';

describe('PanelClock calendar navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-03-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('navigates with arrow keys and selects with Enter', () => {
    const { getByRole, getByLabelText, queryByLabelText } = render(<PanelClock />);
    const toggle = getByRole('button');

    fireEvent.click(toggle);

    const today = getByLabelText('Wednesday, March 15, 2023');
    expect(document.activeElement).toBe(today);

    fireEvent.keyDown(today, { key: 'ArrowRight' });
    const nextDay = getByLabelText('Thursday, March 16, 2023');
    expect(document.activeElement).toBe(nextDay);

    fireEvent.keyDown(nextDay, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(today);

    fireEvent.keyDown(today, { key: 'ArrowDown' });
    const nextWeek = getByLabelText('Wednesday, March 22, 2023');
    expect(document.activeElement).toBe(nextWeek);

    fireEvent.keyDown(nextWeek, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(today);

    const clickSpy = jest.fn();
    today.addEventListener('click', clickSpy);
    fireEvent.keyDown(today, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();

    fireEvent.keyDown(today, { key: 'Escape' });
    expect(document.activeElement).toBe(toggle);
    expect(queryByLabelText('Wednesday, March 15, 2023')).toBeNull();
  });
});

