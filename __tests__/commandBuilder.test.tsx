import { render, screen } from '@testing-library/react';
import CommandBuilder, {
  buildShareLink,
  decodeSharedCommand,
  parseCommand,
  stringifyCommand,
} from '../components/util-components/CommandBuilder';

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/apps/security-tools',
    asPath: '/apps/security-tools',
    query: {},
    isReady: true,
    replace: jest.fn(),
  }),
}));

describe('parseCommand', () => {
  it('parses commands with args and flags', () => {
    const ast = parseCommand("curl -X POST --data 'foo bar' https://example.com");
    expect(ast.errors).toHaveLength(0);
    expect(ast.command).toBe('curl');
    expect(ast.args).toEqual(['https://example.com']);
    expect(ast.flags).toEqual([
      { type: 'short', name: 'X', value: 'POST' },
      { type: 'long', name: 'data', value: 'foo bar' },
    ]);
  });

  it('roundtrips through stringifyCommand', () => {
    const initial = "grep -in --color=always 'pattern here' ./logs";
    const parsed = parseCommand(initial);
    expect(parsed.errors).toHaveLength(0);
    const normalized = stringifyCommand(parsed);
    const roundtrip = parseCommand(normalized);
    expect(roundtrip.errors).toHaveLength(0);
    expect(roundtrip.command).toBe(parsed.command);
    expect(roundtrip.args).toEqual(parsed.args);
    expect(roundtrip.flags).toEqual(parsed.flags);
  });
});

describe('sharing', () => {
  it('builds share links that preserve the command', () => {
    const ast = parseCommand('tar -czf archive.tgz --exclude node_modules ./project');
    expect(ast.errors).toHaveLength(0);
    const normalized = stringifyCommand(ast);
    const href = buildShareLink('/apps/security-tools', normalized);
    const encoded = href.split('?cmd=')[1];
    expect(encoded).toBe(encodeURIComponent(normalized));
    const decoded = decodeSharedCommand(encoded ?? '');
    expect(decoded).toBe(normalized);
    const roundtrip = parseCommand(decoded || '');
    expect(roundtrip.errors).toHaveLength(0);
    expect(roundtrip.command).toBe(ast.command);
    expect(roundtrip.args).toEqual(ast.args);
    expect(roundtrip.flags).toEqual(ast.flags);
  });
});

describe('CommandBuilder component', () => {
  it('shows validation feedback when the command is invalid', () => {
    render(<CommandBuilder doc="Test" initialCommand={'echo "unterminated'} />);
    expect(screen.getByRole('status')).toHaveTextContent('Unclosed double quote.');
  });
});
