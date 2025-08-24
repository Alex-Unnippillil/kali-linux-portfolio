import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import IpDnsLeak, { utils } from '@components/apps/ip-dns-leak';

describe('IpDnsLeak', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders results and copies report', async () => {
    const mockUtils = {
      gatherIps: jest.fn().mockResolvedValue({
        local: [],
        public: ['203.0.113.10'],
        mdns: false,
      }),
      testDns: jest.fn().mockResolvedValue([
        { hostname: 'example.com', resolver: 'Cloudflare', addresses: ['93.184.216.34'] },
      ]),
      fetchPublicIps: jest.fn().mockResolvedValue({ ips: ['203.0.113.10'], errors: [] }),
    } as typeof utils;
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ resolvers: [] }),
    });

    const { getByText } = render(<IpDnsLeak utils={mockUtils} />);
    fireEvent.click(getByText('Run'));

    await waitFor(() => getByText(/Public Candidates/));

    fireEvent.click(getByText('Copy Report'));
    expect((navigator.clipboard.writeText as any)).toHaveBeenCalled();
  });

  it('shows errors and allows retry', async () => {
    const mockUtils = {
      gatherIps: jest.fn().mockRejectedValue(new Error('stun fail')),
      testDns: jest.fn().mockResolvedValue([]),
      fetchPublicIps: jest.fn().mockResolvedValue({ ips: [], errors: ['public ip failed'] }),
    } as typeof utils;
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ resolvers: [] }),
    });

    const { getByText, findByText } = render(<IpDnsLeak utils={mockUtils} />);
    fireEvent.click(getByText('Run'));

    await findByText(/public ip failed/i);
    expect(getByText('Retry')).toBeInTheDocument();
  });
});
