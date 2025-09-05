import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyboardLayoutIndicator from '../components/util-components/keyboard-layout';

describe('KeyboardLayoutIndicator', () => {
  test('allows selecting different layout', async () => {
    render(<KeyboardLayoutIndicator />);
    await userEvent.click(screen.getByRole('button', { name: /keyboard layout/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'DE' }));
    await screen.findByText('DE');
    expect(screen.getByRole('button', { name: /keyboard layout/i })).toHaveTextContent('DE');
  });
});
