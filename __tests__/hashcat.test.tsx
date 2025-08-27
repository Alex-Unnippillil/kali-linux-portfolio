import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import HashcatApp, { detectHashType } from '../components/apps/hashcat';
import progressInfo from '../components/apps/hashcat/progress.json';

describe('HashcatApp', () => {
  it('auto-detects hash types', () => {
    expect(detectHashType('d41d8cd98f00b204e9800998ecf8427e')).toBe('0');
    expect(detectHashType('da39a3ee5e6b4b0d3255bfef95601890afd80709')).toBe('100');
    expect(
      detectHashType(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      )
    ).toBe('1400');
    expect(
      detectHashType('$2y$10$' + 'a'.repeat(53))
    ).toBe('3200');
  });

  it('displays benchmark results', async () => {
    const { getByText, getByTestId } = render(<HashcatApp />);
    fireEvent.click(getByText('Run Benchmark'));
    await waitFor(() => {
      expect(getByTestId('benchmark-output').textContent).toMatch(/GPU0/);
    });
  });

  it('shows progress info from JSON', () => {
    const { getByText } = render(<HashcatApp />);
    const first = progressInfo.steps[0];
    expect(
      getByText(`Attempts/sec: ${first.attemptsPerSec}`)
    ).toBeInTheDocument();
    expect(getByText(`ETA: ${first.eta}`)).toBeInTheDocument();
    expect(getByText(`Mode: ${progressInfo.mode}`)).toBeInTheDocument();
    expect(getByText(progressInfo.disclaimer)).toBeInTheDocument();
  });
});
