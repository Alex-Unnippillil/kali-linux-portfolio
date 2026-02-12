import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import HashcatApp, {
  detectHashType,
  generateWordlist,
} from '../components/apps/hashcat';
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
      // The benchmark now reports full hashcat-style output (e.g. "GPU0: 4500 MH/s")
      // instead of merely containing the device label. Verify the numeric speed and
      // units to ensure the component renders the complete result.
      expect(getByTestId('benchmark-output').textContent).toMatch(/GPU0: \d+ MH\/s/);
    });
  });

  it('animates attempts/sec and ETA from JSON', () => {
    jest.useFakeTimers();
    const { getByText } = render(<HashcatApp />);
    expect(
      getByText(`Attempts/sec: ${progressInfo.hashRate[0]}`)
    ).toBeInTheDocument();
    expect(
      getByText(`Recovered: ${progressInfo.recovered[0]}`)
    ).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(
      getByText(`Attempts/sec: ${progressInfo.hashRate[1]}`)
    ).toBeInTheDocument();
    expect(getByText(`ETA: ${progressInfo.eta[1]}`)).toBeInTheDocument();
    expect(
      getByText(`Recovered: ${progressInfo.recovered[1]}`)
    ).toBeInTheDocument();
    expect(getByText('Mode: Straight')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('labels hashcat modes with example hashes', () => {
    const { getByLabelText, getAllByText } = render(<HashcatApp />);
    fireEvent.change(getByLabelText('Hash Type:'), { target: { value: '100' } });
    expect(
      getAllByText(
        'Example hash: 5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8'
      )[0]
    ).toBeInTheDocument();
    expect(
      getAllByText('Description: 160-bit secure hash algorithm')[0]
    ).toBeInTheDocument();
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
      'hashcat -m 0 -a 0 5f4dcc3b5aa765d61d8327deb882cf99 rockyou.txt'
    );
    expect(getByText('Sample Output:')).toBeInTheDocument();
  });

  it('shows descriptions for hash modes', () => {
    const { getAllByText } = render(<HashcatApp />);
    expect(
      getAllByText('Description: Fast, legacy 32-character hash')[0]
    ).toBeInTheDocument();
  });

  it('allows mask building in brute-force mode', () => {
    const { getByLabelText, getByText } = render(<HashcatApp />);
    fireEvent.change(getByLabelText('Attack Mode:'), { target: { value: '3' } });
    fireEvent.click(getByText('?d'));
    expect((getByLabelText('Mask') as HTMLInputElement).value).toBe('?d');
  });

  it('estimates candidate space for mask', () => {
    const { getByLabelText, getByText } = render(<HashcatApp />);
    fireEvent.change(getByLabelText('Attack Mode:'), { target: { value: '3' } });
    fireEvent.change(getByLabelText('Mask'), { target: { value: '?d?d' } });
    expect(getByText(/Candidate space:/).textContent).toContain('100');
  });

  it('previews selected rule set', () => {
    const { getByLabelText } = render(<HashcatApp />);
    fireEvent.change(getByLabelText('Rule Set:'), {
      target: { value: 'best64' },
    });
    const pre = getByLabelText('Rule Set:').parentElement?.querySelector('pre');
    expect(pre?.textContent).toContain('c');
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

  it('expands mask tokens when generating wordlists', () => {
    const wordlist = generateWordlist('?d?d');
    expect(wordlist[0]).toBe('00');
    expect(wordlist[1]).toBe('01');
    expect(wordlist[99]).toBe('99');
    expect(wordlist).toHaveLength(100);
  });

  it('supports literal characters in masks', () => {
    const wordlist = generateWordlist('ab?l');
    expect(wordlist[0]).toBe('aba');
    expect(wordlist[25]).toBe('abz');
    expect(wordlist).toHaveLength(26);
  });

  it('caps generated wordlists at 1000 entries', () => {
    const wordlist = generateWordlist('?d?d?d?d?d?d?d?d?d?d');
    expect(wordlist).toHaveLength(1000);
    expect(wordlist[0]).toBe('0000000000');
  });
});
