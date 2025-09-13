import { render, screen } from '@testing-library/react';
import PanelClock from '../components/panel/PanelClock';

describe('PanelClock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2020-01-01T13:05:07'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders time in 24-hour format', () => {
    render(<PanelClock showSeconds={false} />);
    expect(screen.getByText('13:05')).toBeInTheDocument();
  });

  test('renders seconds when enabled', () => {
    render(<PanelClock showSeconds={true} />);
    expect(screen.getByText('13:05:07')).toBeInTheDocument();
  });
});
