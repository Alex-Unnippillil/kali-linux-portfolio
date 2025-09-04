import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressDialog from '../components/ui/ProgressDialog';

test('progress dialog updates and can be canceled', () => {
  jest.useFakeTimers();

  const Wrapper: React.FC = () => {
    const [open, setOpen] = React.useState(true);
    return <ProgressDialog isOpen={open} onCancel={() => setOpen(false)} />;
  };

  render(<Wrapper />);

  const bar = screen.getByRole('progressbar');
  expect(bar).toHaveAttribute('aria-valuenow', '0');

  act(() => {
    jest.advanceTimersByTime(1000);
  });

  expect(parseInt(bar.getAttribute('aria-valuenow')!, 10)).toBeGreaterThan(0);

  fireEvent.click(screen.getByText('Cancel'));
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

  jest.useRealTimers();
});
