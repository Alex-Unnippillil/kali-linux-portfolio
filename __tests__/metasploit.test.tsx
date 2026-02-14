import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MetasploitApp from '../components/apps/metasploit';
import {
  buildMetasploitLootResponse,
  type MetasploitLootResponse,
} from '../tests/builders/metasploit';

function getAuxiliaryModuleOverrides() {
  return {
    name: 'auxiliary/scanner/http/title',
    type: 'auxiliary',
    severity: 'low',
    tags: ['http', 'scanner'],
    transcript: '[*] Auxiliary scan completed',
  } as const;
}

function getExploitModuleOverrides() {
  return {
    name: 'exploit/windows/smb/ms17_010_eternalblue',
    type: 'exploit',
    severity: 'high',
    tags: ['windows', 'smb'],
    transcript: '[*] Exploit completed successfully',
    doc: 'Mock documentation for EternalBlue',
  } as const;
}

function getPostModuleOverrides() {
  return {
    name: 'post/windows/gather/credentials',
    type: 'post',
    severity: 'medium',
    tags: ['windows', 'post'],
    transcript: '[*] Gathered credentials from session',
  } as const;
}

function loadMetasploitModules() {
  const { buildMetasploitModule } = require('../tests/builders/metasploit') as typeof import('../tests/builders/metasploit');
  return [
    buildMetasploitModule(getAuxiliaryModuleOverrides()),
    buildMetasploitModule(getExploitModuleOverrides()),
    buildMetasploitModule(getPostModuleOverrides()),
  ];
}

jest.mock('../components/apps/metasploit/modules.json', () => ({
  __esModule: true,
  default: loadMetasploitModules(),
}));

const [, exploitModule] = loadMetasploitModules();

const createFetchMock = (
  data: MetasploitLootResponse,
): jest.MockedFunction<typeof fetch> =>
  jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve(data),
    } as Response),
  ) as unknown as jest.MockedFunction<typeof fetch>;

describe('Metasploit app', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    fetchMock = createFetchMock(buildMetasploitLootResponse());
    global.fetch = fetchMock;
    localStorage.clear();
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }) as unknown as typeof window.matchMedia;
    window.requestAnimationFrame = jest
      .fn(() => 0) as unknown as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = jest
      .fn(() => {}) as unknown as typeof window.cancelAnimationFrame;
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('does not call module API in demo mode', async () => {
    render(<MetasploitApp demoMode />);
    await screen.findByText('Run Demo');
    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/metasploit');
  });

  it('shows transcript when module selected', async () => {
    render(<MetasploitApp demoMode />);
    const moduleText = await screen.findByText(exploitModule.name);
    const moduleEl = moduleText.closest('button');
    expect(moduleEl).not.toBeNull();
    fireEvent.click(moduleEl!);
    const transcriptLines = await screen.findAllByText(/Exploit completed successfully/);
    expect(transcriptLines.length).toBeGreaterThan(0);
  });

  it('shows module docs in sidebar', async () => {
    render(<MetasploitApp demoMode />);
    const moduleText = await screen.findByText(exploitModule.name);
    const moduleEl = moduleText.closest('button');
    expect(moduleEl).not.toBeNull();
    fireEvent.click(moduleEl!);
    expect(
      await screen.findByText(/Mock documentation for EternalBlue/),
    ).toBeInTheDocument();
  });

  it('shows legal banner', () => {
    render(<MetasploitApp demoMode />);
    expect(
      screen.getByText(/authorized security testing and educational use only/i)
    ).toBeInTheDocument();
  });

  it.skip('outputs demo logs', async () => {
    render(<MetasploitApp demoMode />);
    fireEvent.click(screen.getByText('Run Demo'));
    expect(
      await screen.findByText(/Started reverse TCP handler/)
    ).toBeInTheDocument();
  });

  it('toggles loot viewer', async () => {
    const lootResponse = buildMetasploitLootResponse({
      loot: [{ host: '10.0.0.2', data: 'secret' }],
      notes: [{ host: '10.0.0.2', note: 'priv user' }],
    });
    fetchMock = createFetchMock(lootResponse);
    global.fetch = fetchMock;

    render(<MetasploitApp demoMode />);
    fireEvent.click(screen.getByText('Toggle Loot/Notes'));
    expect(await screen.findByText(/10.0.0.2: secret/)).toBeInTheDocument();
    expect(screen.getByText(/priv user/)).toBeInTheDocument();
  });

  it.skip('logs loot during replay', async () => {
    jest.useFakeTimers();
    render(<MetasploitApp demoMode />);
    fireEvent.click(screen.getByText('Replay Mock Exploit'));
    await act(async () => {
      jest.runAllTimers();
    });
    expect(
      await screen.findByText('10.0.0.3: ssh-creds.txt')
    ).toBeInTheDocument();
    jest.useRealTimers();
  });
});

