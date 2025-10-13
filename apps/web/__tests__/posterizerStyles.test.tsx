import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Posterizer from '../apps/quote/components/Posterizer';

describe('Posterizer styles', () => {
  it('cycles through predefined styles', async () => {
    const quote = { content: 'Hello world', author: 'Anon' };
    render(<Posterizer quote={quote} />);
    expect(screen.getByText(/style: classic/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /next style/i }));
    expect(screen.getByText(/style: inverted/i)).toBeInTheDocument();
  });
});

