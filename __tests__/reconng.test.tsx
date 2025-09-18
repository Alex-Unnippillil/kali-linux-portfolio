import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconNG from '../components/apps/reconng';

describe('ReconNG app', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ modules: ['Port Scan'] }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('stores API keys in localStorage', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Settings'));
    const input = screen.getByPlaceholderText('DNS Enumeration API Key');
    await userEvent.type(input, 'abc123');
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('reconng-api-keys') || '{}');
      expect(stored['DNS Enumeration']).toBe('abc123');
    });
  });

  it('hides API keys by default', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Settings'));
    const input = screen.getByPlaceholderText('DNS Enumeration API Key');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('loads marketplace modules', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Marketplace'));
    expect(await screen.findByText('Port Scan')).toBeInTheDocument();
  });

  it('allows tagging scripts', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Marketplace'));
    const input = await screen.findByPlaceholderText('Tag Port Scan');
    await userEvent.type(input, 'network{enter}');
    expect(await screen.findByText('network')).toBeInTheDocument();
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('reconng-script-tags') || '{}'
      );
      expect(stored['Port Scan']).toEqual(['network']);
    });
  });

  it('dedupes entities in table', async () => {
    render(<ReconNG />);
    const input = screen.getByPlaceholderText('Target');
    await userEvent.type(input, 'example.com');
    await userEvent.click(screen.getAllByText('Run')[1]);
    await screen.findByText('John Doe');
    await userEvent.click(screen.getAllByText('Run')[1]);
    const rows = screen.getAllByText('example.com');
    expect(rows.length).toBe(1);
  });

  it('persists template edits to localStorage', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Reports'));
    const body = screen.getByLabelText('Body');
    await userEvent.clear(body);
    await userEvent.type(body, 'Summary for {{title}}');
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('reconng-template-library') || '{}',
      );
      const [first] = Object.values(stored) as { template: string }[];
      expect(first.template).toContain('Summary for');
    });
  });

  it('inserts template text at the cursor when editing findings', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Reports'));
    const notes = screen.getByLabelText('Finding Notes');
    await userEvent.clear(notes);
    await userEvent.type(notes, 'Hello');
    (notes as HTMLTextAreaElement).setSelectionRange(2, 2);
    await userEvent.click(screen.getByRole('button', { name: /Insert Template/i }));
    await waitFor(() => {
      expect(notes).toHaveValue('He- Open Port 80 (Low)\nllo');
    });
  });

  it('imports templates from a JSON file', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Reports'));
    await userEvent.click(screen.getByRole('button', { name: /Import \/ Share/i }));
    const fileInput = screen.getByLabelText('Import templates JSON');
    const content = JSON.stringify({
      custom: { name: 'Custom', template: 'Custom snippet {{title}}' },
    });
    const file = new File([content], 'templates.json', {
      type: 'application/json',
    });
    await userEvent.upload(fileInput, file);
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('reconng-template-library') || '{}',
      );
      expect(Object.keys(stored)).toContain('custom');
    });
  });
});
