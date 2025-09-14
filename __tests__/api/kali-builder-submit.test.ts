import { createMocks } from 'node-mocks-http';

var sendMock: jest.Mock;
var startBuildMock: jest.Mock;

jest.mock('@aws-sdk/client-codebuild', () => {
  sendMock = jest.fn();
  startBuildMock = jest.fn();
  return {
    CodeBuildClient: jest.fn(() => ({ send: sendMock })),
    StartBuildCommand: startBuildMock,
  };
});

import handler from '../../pages/api/kali-builder/submit';
import { StartBuildCommand } from '@aws-sdk/client-codebuild';

describe('kali-builder submit api', () => {
  beforeEach(() => {
    sendMock.mockReset();
    startBuildMock.mockReset();
    process.env.AWS_CODEBUILD_PROJECT_NAME = 'builder';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'id';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
  });

  afterEach(() => {
    delete process.env.AWS_CODEBUILD_PROJECT_NAME;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  test('starts a build and returns job id', async () => {
    sendMock.mockResolvedValue({ build: { id: 'job-123' } });

    const { req, res } = createMocks({
      method: 'POST',
      body: { repoUrl: 'https://github.com/foo/bar' },
    });

    await handler(req as any, res as any);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(StartBuildCommand).toHaveBeenCalledWith({
      projectName: 'builder',
      environmentVariablesOverride: [
        { name: 'REPO_URL', value: 'https://github.com/foo/bar' },
      ],
    });
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ jobId: 'job-123' });
  });

  test('returns 400 on invalid payload', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { repoUrl: 'not-a-url' },
    });

    await handler(req as any, res as any);

    expect(sendMock).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(400);
  });
});

