import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '../components/screen/navbar';

jest.mock('next/image', () => {
  const MockedImage = ({ src = '', alt = '', ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} {...rest} />
  );
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

describe('Navbar accessibility', () => {
  it('allows keyboard navigation through the quick settings dialog', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const statusButton = screen.getByRole('button', { name: /system status/i });
    statusButton.focus();
    expect(statusButton).toHaveFocus();

    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog', { name: /quick settings/i });
    const themeButton = within(dialog).getByRole('button', { name: /theme/i });
    await waitFor(() => expect(themeButton).toHaveFocus());

    await user.keyboard('{Escape}');

    await waitFor(() => expect(statusButton).toHaveFocus());
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /quick settings/i })).not.toBeInTheDocument(),
    );
  });
});
