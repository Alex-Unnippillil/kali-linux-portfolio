import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Converter from '../../../apps/converter';

describe('Converter history panel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders history toggle and entries after a conversion', async () => {
    render(<Converter />);

    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBeGreaterThan(3);
    });

    const inputs = await screen.findAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '2' } });

    const toggle = await screen.findByRole('button', { name: /show history/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('converter-history-entry')).toBeNull();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    const entries = await screen.findAllByTestId('converter-history-entry');
    expect(entries.length).toBeGreaterThan(0);

    const copyButtons = screen.getAllByRole('button', { name: /copy result/i });
    expect(copyButtons.length).toBeGreaterThan(0);
  });
});
