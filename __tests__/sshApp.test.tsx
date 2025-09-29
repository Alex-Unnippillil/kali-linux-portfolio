import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SSHApp, { SSHSnippetGallery } from '../apps/ssh';

describe('SSH snippet gallery', () => {
  it('renders inside the window shell', () => {
    render(<SSHApp />);
    expect(screen.getByText(/SSH Snippet Gallery/i)).toBeInTheDocument();
  });

  it('copies the password login snippet exactly', async () => {
    const user = userEvent.setup();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    render(<SSHSnippetGallery clipboard={{ writeText: writeTextMock }} />);
    await user.click(
      screen.getByRole('button', {
        name: /copy "password login" snippet/i,
      })
    );
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('ssh user@example.com');
    });
  });

  it('copies the rsync snippet with flags intact', async () => {
    const user = userEvent.setup();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    render(<SSHSnippetGallery clipboard={{ writeText: writeTextMock }} />);
    await user.click(
      screen.getByRole('button', {
        name: /copy "rsync over ssh" snippet/i,
      })
    );
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        'rsync -avz -e "ssh -i ~/.ssh/id_ed25519" ./site/ user@example.com:/var/www/site/'
      );
    });
  });
});
