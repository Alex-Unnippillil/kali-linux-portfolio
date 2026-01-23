import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EttercapPage from '../../../apps/ettercap';

jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('EttercapPage status chips', () => {
  it('renders the status chips once the demo starts', () => {
    render(<EttercapPage />);

    fireEvent.click(screen.getByRole('button', { name: /start demo/i }));

    const getChip = (pattern: RegExp) =>
      screen.getByText((_, element) => {
        if (!element) return false;
        const text = element.textContent ?? '';
        return element.tagName.toLowerCase() === 'span' && pattern.test(text);
      });

    expect(getChip(/Mode:\s+Normal traffic/i)).toBeInTheDocument();
    expect(getChip(/State:\s+Running/i)).toBeInTheDocument();
    expect(getChip(/Logs:\s+0\s+entries/i)).toBeInTheDocument();
  });
});
