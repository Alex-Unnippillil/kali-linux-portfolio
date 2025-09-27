import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import OpsDashboard, { REFRESH_INTERVAL_MS } from '../apps/ops-dashboard';

const createResponse = <T,>(data: T) =>
  ({
    ok: true,
    json: async () => data,
  }) as Response;

const advanceAndFlush = async () => {
  await act(async () => {
    jest.advanceTimersByTime(REFRESH_INTERVAL_MS);
    await Promise.resolve();
  });
};

describe('OpsDashboard', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (global as typeof global & { fetch?: typeof fetch }).fetch;
    }
  });

  it('transitions tile status when metrics cross thresholds', async () => {
    const pingGood = {
      updatedAt: '2024-05-17T10:00:00.000Z',
      regions: [
        { name: 'us-east', latencyMs: 150, slaMs: 220 },
        { name: 'eu-central', latencyMs: 160, slaMs: 210 },
      ],
    };
    const errorsGood = {
      updatedAt: '2024-05-17T10:00:00.000Z',
      services: [
        { name: 'api-gateway', errorRate: 0.01, target: 0.02 },
        { name: 'auth-service', errorRate: 0.008, target: 0.02 },
      ],
    };
    const versionInfo = {
      version: '2024.05.17',
      build: 'ops-dashboard-demo',
      commit: 'opsdemo123',
      releasedAt: '2024-05-17T08:00:00.000Z',
      notes: 'Mock metadata',
    };
    const pingWarning = {
      updatedAt: '2024-05-17T10:00:15.000Z',
      regions: [
        { name: 'us-east', latencyMs: 280, slaMs: 220 },
        { name: 'eu-central', latencyMs: 260, slaMs: 210 },
      ],
    };
    const errorsWarning = {
      updatedAt: '2024-05-17T10:00:15.000Z',
      services: [
        { name: 'api-gateway', errorRate: 0.035, target: 0.02 },
        { name: 'auth-service', errorRate: 0.015, target: 0.02 },
      ],
    };
    const pingCritical = {
      updatedAt: '2024-05-17T10:00:30.000Z',
      regions: [
        { name: 'us-east', latencyMs: 380, slaMs: 220 },
        { name: 'eu-central', latencyMs: 360, slaMs: 210 },
      ],
    };
    const errorsCritical = {
      updatedAt: '2024-05-17T10:00:30.000Z',
      services: [
        { name: 'api-gateway', errorRate: 0.08, target: 0.02 },
        { name: 'auth-service', errorRate: 0.03, target: 0.02 },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(createResponse(pingGood))
      .mockResolvedValueOnce(createResponse(errorsGood))
      .mockResolvedValueOnce(createResponse(versionInfo))
      .mockResolvedValueOnce(createResponse(pingWarning))
      .mockResolvedValueOnce(createResponse(errorsWarning))
      .mockResolvedValueOnce(createResponse(pingCritical))
      .mockResolvedValueOnce(createResponse(errorsCritical));

    render(<OpsDashboard />);

    await waitFor(() =>
      expect(screen.getByTestId('tile-pings')).toHaveAttribute(
        'data-status',
        'good',
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('tile-errors')).toHaveAttribute(
        'data-status',
        'good',
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('tile-version')).toHaveAttribute(
        'data-status',
        'good',
      ),
    );

    await advanceAndFlush();

    await waitFor(() =>
      expect(screen.getByTestId('tile-pings')).toHaveAttribute(
        'data-status',
        'warning',
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('tile-errors')).toHaveAttribute(
        'data-status',
        'warning',
      ),
    );

    await advanceAndFlush();

    await waitFor(() =>
      expect(screen.getByTestId('tile-pings')).toHaveAttribute(
        'data-status',
        'critical',
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('tile-errors')).toHaveAttribute(
        'data-status',
        'critical',
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/status/pings', {
      cache: 'no-store',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/status/errors', {
      cache: 'no-store',
    });
    expect(fetchMock).toHaveBeenCalledWith('/version.json', { cache: 'no-store' });
  });
});
