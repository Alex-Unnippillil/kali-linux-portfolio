import { render, act } from '@testing-library/react';
import PanelClock from '../components/PanelClock';

describe('PanelClock', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T08:09:10Z'));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('formats the current time using Intl with overrides', () => {
    const { container } = render(
      <PanelClock locale="en-GB" timeZone="UTC" />
    );

    const timeElement = container.querySelector('time');
    expect(timeElement).not.toBeNull();
    expect(timeElement).toHaveTextContent('08:09:10');
    expect(timeElement?.getAttribute('datetime')).toBe(
      new Date('2024-01-01T08:09:10.000Z').toISOString()
    );
  });

  it('updates the displayed time every second', () => {
    const { container } = render(
      <PanelClock locale="en-GB" timeZone="UTC" />
    );

    const timeElement = container.querySelector('time') as HTMLElement;
    expect(timeElement).toHaveTextContent('08:09:10');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(timeElement).toHaveTextContent('08:09:11');
    expect(timeElement.getAttribute('datetime')).toBe(
      new Date('2024-01-01T08:09:11.000Z').toISOString()
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(timeElement).toHaveTextContent('08:09:13');
  });
});
