import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GuideFlow from '../components/GuideFlow';

describe('GuideFlow', () => {
  it('branches and preserves answers when navigating back', () => {
    render(<GuideFlow />);

    // select first option
    fireEvent.click(screen.getByLabelText('Reconnaissance'));
    fireEvent.click(screen.getByText('Next'));

    // now in recon question
    expect(screen.getByText('Which recon guide do you need?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Nmap NSE Walkthrough'));
    fireEvent.click(screen.getByText('Back'));

    // back to first question with selection preserved
    expect(screen.getByText('What area do you want to explore?')).toBeInTheDocument();
    const recon = screen.getByLabelText('Reconnaissance') as HTMLInputElement;
    expect(recon.checked).toBe(true);

    fireEvent.click(screen.getByText('Next'));
    const nmap = screen.getByLabelText('Nmap NSE Walkthrough') as HTMLInputElement;
    expect(nmap.checked).toBe(true);
  });
});

