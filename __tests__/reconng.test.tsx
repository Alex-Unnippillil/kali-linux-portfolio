import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconNG from '../components/apps/reconng';

const marketplaceFixture = {
  modules: [
    {
      name: 'Port Scan',
      summary: 'Simulated scan output',
      recommendedTags: ['network'],
    },
  ],
};

const datasetFixture = {
  labMessage: 'Lab data only. No live traffic is generated.',
  playbooks: [
    {
      id: 'demo-flow',
      title: 'Demo Flow',
      description: 'Walk through the canned modules.',
      steps: [
        {
          title: 'Enumerate DNS',
          details: 'Run DNS module with demo data.',
          artifacts: ['example.com'],
          expect: 'Graph populates with the demo host.',
        },
      ],
    },
  ],
  commandBuilder: {
    title: 'Safe Command Builder',
    description: 'Assemble commands from sanitized fixtures.',
    commands: [
      {
        id: 'dns-enum',
        title: 'DNS Enumeration',
        description: 'Load google_site with demo target.',
        placeholders: [
          {
            token: '{TARGET}',
            label: 'Target Domain',
            values: ['example.com', 'demo.local'],
            default: 'example.com',
            helperText: 'Targets are sourced from documentation ranges.',
          },
        ],
        steps: ['step {TARGET}'],
        safeOutput: 'output {TARGET}',
      },
    ],
  },
};

const chainFixture = {
  chain: {
    nodes: [{ data: { id: 'dns', label: 'DNS Enumeration' } }],
    edges: [],
  },
};

const buildResponse = (body: unknown) =>
  Promise.resolve({
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response);

describe('ReconNG app', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.endsWith('/reconng-marketplace.json')) {
        return buildResponse(marketplaceFixture);
      }
      if (url.endsWith('/reconng-dataset.json')) {
        return buildResponse(datasetFixture);
      }
      if (url.endsWith('/reconng-chain.json')) {
        return buildResponse(chainFixture);
      }
      return buildResponse({});
    }) as jest.Mock;
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
    const cardHeading = await screen.findByText('Port Scan');
    const moduleCard = cardHeading.closest('li');
    expect(moduleCard).not.toBeNull();
    await waitFor(() => {
      expect(within(moduleCard as HTMLElement).getAllByText('network')).toHaveLength(2);
    });
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('reconng-script-tags') || '{}'
      );
      expect(stored['Port Scan']).toEqual(['network']);
    });
  });

  it('shows lab messaging and playbook steps', async () => {
    render(<ReconNG />);
    expect(
      await screen.findByText('Lab data only. No live traffic is generated.')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText('Playbooks'));
    expect(await screen.findByText('Enumerate DNS')).toBeInTheDocument();
    const artifactsLine = await screen.findByText(
      (content, element) => element?.textContent === 'Artifacts: example.com'
    );
    expect(artifactsLine).toBeInTheDocument();
  });

  it('updates command builder preview when selecting a different target', async () => {
    render(<ReconNG />);
    expect(await screen.findByText(/step example\.com/)).toBeInTheDocument();
    const select = screen.getByLabelText('Target Domain');
    await userEvent.selectOptions(select, 'demo.local');
    expect(await screen.findByText(/step demo\.local/)).toBeInTheDocument();
    expect(screen.getByText(/output demo\.local/)).toBeInTheDocument();
  });

  it('dedupes entities in table', async () => {
    render(<ReconNG />);
    const input = screen.getByPlaceholderText('Lab target (domain or IP)');
    await userEvent.type(input, 'example.com');
    await userEvent.click(screen.getAllByText('Run')[1]);
    await screen.findByText('John Doe');
    await userEvent.click(screen.getAllByText('Run')[1]);
    const domainHeading = screen.getByText(
      (content, element) => element?.textContent === 'domain'
    );
    const domainsSection = domainHeading.closest('div');
    expect(domainsSection).not.toBeNull();
    await waitFor(() => {
      const rows = within(domainsSection as HTMLElement).getAllByText('example.com');
      expect(rows.length).toBe(1);
    });
  });
});
