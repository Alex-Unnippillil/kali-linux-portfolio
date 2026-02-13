import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportTemplates from '../../../../components/apps/reconng/components/ReportTemplates';
import { IMPORT_LOG_KEY } from '../../../../components/apps/reconng/utils/importRisk';

describe('ReportTemplates import risk panel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows low risk badge and allows import without preview for safe files', async () => {
    const user = userEvent.setup();
    render(<ReportTemplates />);

    await user.click(screen.getByRole('button', { name: /Import\/Share/i }));
    const input = screen.getByLabelText(/Import templates/i);
    const file = new File(
      [
        JSON.stringify({
          custom: { name: 'Custom Template', template: 'Example {{title}}' },
        }),
      ],
      'templates.json',
      {
        type: 'application/json',
      },
    );
    await user.upload(input, file);

    expect(screen.getByText(/^Low risk$/i)).toBeInTheDocument();

    const importButton = screen.getByRole('button', { name: /^Import$/i });
    expect(importButton).toBeEnabled();

    await user.click(importButton);

    await waitFor(() => {
      const logs = JSON.parse(localStorage.getItem(IMPORT_LOG_KEY) || '[]');
      expect(logs[0]).toMatchObject({ fileName: 'templates.json', level: 'low' });
    });
  });

  it('requires preview before importing high risk files', async () => {
    const user = userEvent.setup();
    render(<ReportTemplates />);

    await user.click(screen.getByRole('button', { name: /Import\/Share/i }));
    const input = screen.getByLabelText(/Import templates/i);
    const largeFile = new File([new Array(600 * 1024).join('a')], 'templates.json', {
      type: 'application/json',
    });
    await user.upload(input, largeFile);

    expect(screen.getByText(/^High risk$/i)).toBeInTheDocument();

    const importButton = screen.getByRole('button', { name: /^Import$/i });
    expect(importButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Preview/i }));

    await waitFor(() => expect(importButton).toBeEnabled());
  });
});
