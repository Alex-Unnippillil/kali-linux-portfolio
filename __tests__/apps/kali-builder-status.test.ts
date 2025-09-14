import { createMocks } from 'node-mocks-http';

jest.mock('@aws-sdk/client-codebuild', () => {
  const send = jest.fn().mockResolvedValue({
    builds: [
      {
        buildStatus: 'IN_PROGRESS',
        logs: { groupName: 'g', streamName: 's' },
      },
    ],
  });
  return {
    CodeBuildClient: jest.fn(() => ({ send })),
    BatchGetBuildsCommand: jest.fn(),
  };
}, { virtual: true });

jest.mock('@aws-sdk/client-cloudwatch-logs', () => {
  const send = jest.fn().mockResolvedValue({
    events: [{ message: 'line1' }, { message: 'line2' }],
  });
  return {
    CloudWatchLogsClient: jest.fn(() => ({ send })),
    GetLogEventsCommand: jest.fn(),
  };
}, { virtual: true });

import handler from '@/pages/api/kali-builder/status';

describe('kali-builder status API', () => {
  test('returns build status and logs', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: 'abc' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.status).toBe('IN_PROGRESS');
    expect(data.logs).toEqual(['line1', 'line2']);
  });
});

