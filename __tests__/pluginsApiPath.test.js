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
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="demo.json"'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff'
    );
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

  it('forces attachment download headers with sanitized filenames for svg payloads', () => {
    const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
    const maliciousName = 'demo-<svg>-payload.svg';
    const filePath = path.join(catalogDir, maliciousName);
    fs.writeFileSync(filePath, '<svg></svg>');

    try {
      const req = { query: { name: maliciousName } };
      const res = createMockRes();

      handler(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="demo-_svg_-payload.svg"'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream'
      );
      const payload = res.send.mock.calls[0][0];
      expect(Buffer.isBuffer(payload)).toBe(true);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('sanitizes script-like filenames to block header injection', () => {
    const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
    const maliciousName = 'evil";filename="run.js';
    const filePath = path.join(catalogDir, maliciousName);
    fs.writeFileSync(filePath, 'console.log("hi")');

    try {
      const req = { query: { name: maliciousName } };
      const res = createMockRes();

      handler(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="evil__filename__run.js"'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream'
      );
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});
