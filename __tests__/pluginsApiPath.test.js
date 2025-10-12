import fs from 'fs';
import path from 'path';

import handler from '../pages/api/plugins/[name]';

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  res.setHeader = jest.fn();
  res.send = jest.fn();
  res.end = jest.fn();
  return res;
};

describe('plugins API path handling', () => {
  it('serves plugin files when the path is valid', () => {
    const req = { query: { name: 'demo.json' } };
    const res = createMockRes();
    const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
    const fileContents = fs.readFileSync(path.join(catalogDir, 'demo.json'));

    handler(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.send).toHaveBeenCalledWith(fileContents);
  });

  it('rejects paths that attempt directory traversal with ../', () => {
    const req = { query: { name: '../secret.json' } };
    const res = createMockRes();

    handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.end).toHaveBeenCalledWith('Invalid path');
    expect(res.send).not.toHaveBeenCalled();
  });

  it('rejects paths that attempt traversal through catalogue/..', () => {
    const req = { query: { name: ['catalogue', '..', '..', 'etc', 'passwd'] } };
    const res = createMockRes();

    handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.end).toHaveBeenCalledWith('Invalid path');
    expect(res.send).not.toHaveBeenCalled();
  });
});
