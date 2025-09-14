import handler from '../../pages/api/kali-builder/status';
import { createMocks } from 'node-mocks-http';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import KaliBuilderPage from '../../pages/apps/kali-builder';

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: '1' } }),
}));

jest.mock('@aws-sdk/client-codebuild', () => {
  return {
    CodeBuildClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        builds: [
          {
            buildStatus: 'IN_PROGRESS',
            logs: { groupName: 'g', streamName: 's' },
          },
        ],
      }),
    })),
    BatchGetBuildsCommand: jest.fn(),
  };
}, { virtual: true });

jest.mock('@aws-sdk/client-cloudwatch-logs', () => {
  return {
    CloudWatchLogsClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({ events: [{ message: 'log1' }] }),
    })),
    GetLogEventsCommand: jest.fn(),
  };
}, { virtual: true });

test('status api returns build status and logs', async () => {
  const { req, res } = createMocks({ method: 'GET', query: { id: '1' } });
  await handler(req as any, res as any);
  expect(res._getStatusCode()).toBe(200);
  expect(res._getJSONData()).toEqual({ status: 'IN_PROGRESS', logs: ['log1'] });
});

class MockEventSource {
  url: string;
  onmessage: ((ev: { data: string }) => void) | null = null;
  close = jest.fn();
  constructor(url: string) {
    this.url = url;
    MockEventSource.instance = this;
  }
  static instance: MockEventSource;
}

// @ts-ignore
global.EventSource = MockEventSource;

test('kali builder page displays status and logs', () => {
  render(React.createElement(KaliBuilderPage));

  act(() => {
    MockEventSource.instance.onmessage?.({
      data: JSON.stringify({ status: 'IN_PROGRESS', logs: ['line'] }),
    });
  });

  expect(screen.getByTestId('status').textContent).toBe('IN_PROGRESS');
  expect(screen.getByTestId('logs').textContent).toContain('line');
});
