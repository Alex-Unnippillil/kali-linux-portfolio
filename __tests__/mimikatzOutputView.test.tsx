import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import OutputView, { parseOutputBlocks } from '../apps/mimikatz/components/OutputView';

describe('parseOutputBlocks', () => {
  const rawOutput = `Authentication Id : 0 ; 123 (00000000:0000007B)
Session           : Interactive from 1
User Name         : alice
Domain            : CONTOSO
Logon Server      : CONTOSO
Logon Time        : 5/14/2024 1:23:45 PM
SID               : S-1-5-21-123456789-123456789-123456789-1001

        msv :
         [00000003] Primary
         * Username : alice
         * Domain   : CONTOSO
         * NTLM     : <redacted>
         * SHA1     : <redacted>
        tspkg :
         * Username : alice
         * Domain   : CONTOSO
         * Password : (null)

Authentication Id : 0 ; 999 (00000000:000003E7)
Session           : Service from 0
User Name         : SYSTEM
Domain            : NT AUTHORITY
Logon Server      : (null)
Logon Time        : 5/14/2024 1:23:45 PM
SID               : S-1-5-18

        msv :
         [00000003] Primary
         * Username : SYSTEM
         * Domain   : NT AUTHORITY
         * NTLM     : <redacted>
         * SHA1     : <redacted>
        tspkg :
         * Username : SYSTEM
         * Domain   : NT AUTHORITY
         * Password : (null)`;

  test('splits logon sessions into metadata-aware blocks', () => {
    const blocks = parseOutputBlocks(rawOutput);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].metadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'User Name', value: 'alice' }),
        expect.objectContaining({ label: 'Domain', value: 'CONTOSO' }),
      ]),
    );
    expect(blocks[0].copyText).not.toMatch(/\s+$/);
    expect(blocks[1].title).toMatch(/SYSTEM/);
  });
});

describe('OutputView component', () => {
  const writeText = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText } });
    writeText.mockClear();
  });

  test('renders collapsible output blocks and copies clean text', async () => {
    const output = `Authentication Id : 0 ; 111 (00000000:0000006F)\nSession : Interactive from 1\nUser Name : demo\nDomain : LAB\n\n        msv :\n         * Username : demo`;

    render(<OutputView output={output} />);

    const toggle = screen
      .getAllByRole('button', { name: /demo/i })
      .find((btn) => btn.getAttribute('aria-controls')) as HTMLButtonElement;
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/msv/i)).toBeInTheDocument();

    const copyButton = screen.getByLabelText('Copy block demo @ LAB');
    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Authentication Id : 0 ; 111'));
  });

  test('shows placeholder when there is no output', () => {
    render(<OutputView output="" emptyPlaceholder={<span>No runs yet</span>} />);
    expect(screen.getByText('No runs yet')).toBeInTheDocument();
  });
});
