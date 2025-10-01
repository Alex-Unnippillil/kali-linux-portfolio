import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportExport from '../apps/autopsy/components/ReportExport';

describe('ReportExport', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copies html report to clipboard', async () => {
    render(
      <ReportExport
        caseName="demo"
        artifacts={[
          {
            name: 'file',
            type: 'txt',
            description: 'desc',
            size: 1,
            plugin: 'p',
            timestamp: '2023-01-01',
          },
        ]}
      />
    );
    await screen.findByLabelText('Redaction preview');
    fireEvent.click(screen.getByText('Copy HTML Report'));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    );
    const payload = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
    expect(payload).toContain('<!DOCTYPE html>');
    expect(payload).toContain('demo Report');
  });
});
