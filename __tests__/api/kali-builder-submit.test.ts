import handler from '../../pages/api/kali-builder/submit';
import { createMocks } from 'node-mocks-http';
import crypto from 'crypto';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-codebuild', () => ({
  CodeBuildClient: jest.fn(() => ({ send: sendMock })),
  StartBuildCommand: jest.fn((args) => args),
}));

describe('kali-builder submit api', () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
    process.env.CODEBUILD_PROJECT_NAME = 'project';
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.CODEBUILD_PROJECT_NAME;
  });

  test('starts build and returns job id', async () => {
    sendMock.mockResolvedValueOnce({ build: { id: 'job-1' } });
    const payload = { repoUrl: 'https://example.com/repo.git', branch: 'main' };
    const expectedSig = crypto
      .createHmac('sha256', 'secret')
      .update(JSON.stringify(payload))
      .digest('hex');
    const { req, res } = createMocks({ method: 'POST', body: payload });

    await handler(req as any, res as any);

    expect(sendMock).toHaveBeenCalledWith({
      projectName: 'project',
      environmentVariablesOverride: [
        { name: 'PAYLOAD', value: JSON.stringify(payload) },
        { name: 'SIGNATURE', value: expectedSig },
      ],
    });
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ id: 'job-1' });
  });

  test('returns 400 for invalid payload', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { repoUrl: 'not-a-url', branch: 'main' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(400);
  });

  test('handles build errors', async () => {
    sendMock.mockRejectedValueOnce(new Error('fail'));
    const { req, res } = createMocks({
      method: 'POST',
      body: { repoUrl: 'https://example.com/repo.git', branch: 'main' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(500);
  });
});

