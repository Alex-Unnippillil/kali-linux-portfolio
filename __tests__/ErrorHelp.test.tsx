import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ErrorHelp from '../components/common/ErrorHelp';

describe('ErrorHelp component', () => {
  it('shows the error summary and default article', () => {
    render(<ErrorHelp code="ERR_NETWORK_TIMEOUT" />);

    expect(screen.getByText('ERR_NETWORK_TIMEOUT')).toBeInTheDocument();
    expect(
      screen.getByText('Network request timed out while contacting the server.')
    ).toBeInTheDocument();

    const article = screen.getByRole('article');
    expect(
      within(article).getByText(
        'Fix connectivity issues when the desktop cannot reach API endpoints or background services.'
      )
    ).toBeInTheDocument();
    expect(within(article).getByText('Quick checks')).toBeInTheDocument();
  });

  it('falls back to the unknown error article when the code is not registered', () => {
    render(<ErrorHelp code="ERR_NOT_REAL" message="Custom failure message" />);

    expect(screen.getByText('ERR_UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('Custom failure message')).toBeInTheDocument();

    const article = screen.getByRole('article');
    expect(
      within(article).getByText('Baseline recovery steps for unknown or unexpected application errors.')
    ).toBeInTheDocument();
  });

  it('updates the article when a search result is selected', async () => {
    render(<ErrorHelp code="ERR_NETWORK_TIMEOUT" />);

    const searchInput = screen.getByLabelText(/Search knowledge base/i);
    fireEvent.change(searchInput, { target: { value: 'integrity' } });

    const resultButton = await screen.findByRole('button', {
      name: /Investigate data integrity warnings/i,
    });
    fireEvent.click(resultButton);

    await waitFor(() => {
      const article = screen.getByRole('article');
      expect(
        within(article).getByText(
          'Steps to follow when checksum or replay protections detect unexpected changes.'
        )
      ).toBeInTheDocument();
      expect(within(article).getByText('Checklist')).toBeInTheDocument();
      expect(searchInput).toHaveValue('');
    });
  });
});
