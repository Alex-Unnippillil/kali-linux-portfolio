import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DownloadCard from '../components/DownloadCard';

describe('DownloadCard', () => {
  it('copies command when copy button is clicked', () => {
    const steps = [{ text: 'Step one', command: 'echo test' }];
    render(<DownloadCard title="Test" steps={steps} />);
    fireEvent.click(screen.getByText('Test'));
    (navigator as any).clipboard = { writeText: jest.fn() };
    fireEvent.click(screen.getByRole('button', { name: /Copy command/i }));
    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith('echo test');
  });
});

