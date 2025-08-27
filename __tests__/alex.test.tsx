import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { About, Resume } from '../components/apps/alex';

jest.mock('react-ga4', () => ({ event: jest.fn(), send: jest.fn() }));

beforeEach(() => {
  (global as any).fetch = jest.fn();
  Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
});

describe('About component', () => {
  it('renders markdown', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      text: () => Promise.resolve('# Hello')
    });
    render(<About />);
    expect(await screen.findByText('Hello')).toBeInTheDocument();
  });

  it('copies email and phone', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      text: () => Promise.resolve('')
    });
    render(<About />);
    await waitFor(() => screen.getByText('Copy Email'));
    fireEvent.click(screen.getByText('Copy Email'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('alex.unnippillil@hotmail.com');
    fireEvent.click(screen.getByText('Copy Phone'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123-456-7890');
  });
});

describe('Resume component', () => {
  it('hides sections when toggled', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        basics: { name: 'Alex', label: 'Dev' },
        work: [{ company: 'Corp', position: 'Dev' }],
        education: [{ institution: 'Uni', studyType: 'CS' }]
      })
    });
    render(<Resume />);
    const toggle = await screen.findByLabelText('work');
    const heading = await screen.findByText('Work');
    const section = heading.closest('section')!;
    fireEvent.click(toggle);
    expect(section.className).toMatch(/hidden/);
    expect(section.className).toMatch(/print-hidden/);
  });
});
