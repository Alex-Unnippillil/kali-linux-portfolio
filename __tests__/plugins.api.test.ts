/**
 * @jest-environment node
 */
import handler from '../pages/api/plugins/[name]';
import { createMocks } from 'node-mocks-http';
import fs from 'fs';
import path from 'path';

describe('plugins API path validation', () => {
  const invokeHandler = (name: string | string[]) => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { name },
    });

    handler(req as any, res as any);

    return res;
  };

  it('rejects catalogue traversal attempts that escape the catalog directory', () => {
    const res = invokeHandler(['catalogue', '..', '..', 'demo.json']);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toBe('Invalid path');
  });

  it('rejects parent directory traversal attempts', () => {
    const res = invokeHandler(['..', 'demo.json']);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toBe('Invalid path');
  });

  it('serves plugin content for valid paths', () => {
    const res = invokeHandler(['demo.json']);
    const expectedBuffer = fs.readFileSync(
      path.join(process.cwd(), 'plugins', 'catalog', 'demo.json'),
    );

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('application/json');
    expect(res._getData()).toEqual(expectedBuffer);
  });
});
