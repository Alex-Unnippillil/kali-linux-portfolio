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
    expect(screen.getByText('Accessibility checklist')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Copy HTML Report'));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    );
    expect((navigator.clipboard.writeText as jest.Mock).mock.calls[0][0]).toContain('<!DOCTYPE html>');
  });

  it('surfaces warnings for missing alt text', async () => {
    render(
      <ReportExport
        caseName="demo"
        artifacts={[
          {
            name: 'file',
            type: 'Image',
            description: 'desc',
            size: 1,
            plugin: 'p',
            timestamp: '2023-01-01',
            evidenceImage: { src: '/img.png' },
          },
        ]}
      />
    );
    const warnings = await screen.findAllByText(
      /Images require descriptive alt text or an empty alt attribute/i
    );
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('warns when heading levels skip', async () => {
    render(
      <ReportExport
        caseName="demo"
        artifacts={[
          {
            name: 'file',
            type: 'Document',
            description: 'desc',
            size: 1,
            plugin: 'p',
            timestamp: '2023-01-01',
            headingLevel: 5,
          },
        ]}
      />
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Headings must increase one level at a time/i);
  });
});
