import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('animates attempts/sec and ETA from JSON', () => {
    jest.useFakeTimers();
    const { getByText } = render(<HashcatApp />);
    expect(
      getByText(`Attempts/sec: ${progressInfo.hashRate[0]}`)
    ).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(
      getByText(`Attempts/sec: ${progressInfo.hashRate[1]}`)
    ).toBeInTheDocument();
    expect(getByText(`ETA: ${progressInfo.eta[1]}`)).toBeInTheDocument();
    expect(getByText('Mode: MD5')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('labels hashcat modes with example hashes', () => {
    const { getByLabelText, getByText } = render(<HashcatApp />);
    fireEvent.change(getByLabelText('Hash Type:'), { target: { value: '100' } });
    expect(
      getByText(
        'Example hash: 5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8'
      )
    ).toBeInTheDocument();
    expect(getByText('Description: 160-bit secure hash algorithm')).toBeInTheDocument();
  });

  it('generates demo command and shows sample output', () => {
    const { getByLabelText, getByTestId, getByText } = render(
      <HashcatApp />
    );
    fireEvent.change(getByLabelText('Hash:'), {
      target: { value: '5f4dcc3b5aa765d61d8327deb882cf99' },
    });
    fireEvent.change(getByLabelText('Wordlist:'), {
      target: { value: 'rockyou' },
    });
    expect(getByTestId('demo-command').textContent).toContain(
      'hashcat -m 0 5f4dcc3b5aa765d61d8327deb882cf99 rockyou.txt'
    );
    expect(getByText('Sample Output:')).toBeInTheDocument();
  });

  it('shows descriptions for hash modes', () => {
    const { getByText } = render(<HashcatApp />);
    expect(getByText('Description: Raw MD5')).toBeInTheDocument();
  });

  it('provides dictionary file hints with example paths', () => {
    const { getByText } = render(<HashcatApp />);
    expect(
      getByText(/\/usr\/share\/wordlists\/rockyou\.txt/)
    ).toBeInTheDocument();
  });

  it('displays GPU requirement notice', () => {
    const { getByText } = render(<HashcatApp />);
    expect(
      getByText(/requires a compatible GPU/i)
    ).toBeInTheDocument();
  });

  it('renders static sample output', () => {
    const { getByText } = render(<HashcatApp />);
    expect(
      getByText(/hashcat \(v6\.2\.6\) starting in benchmark mode/)
    ).toBeInTheDocument();
  });
});
