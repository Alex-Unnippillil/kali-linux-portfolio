import { toKeyfile } from '../utils/nmconnection';

describe('toKeyfile', () => {
  it('converts connection objects to ini format', () => {
    const conn = {
      connection: { id: 'test', type: 'ethernet' },
      ipv4: { method: 'auto' },
    };

    const ini = toKeyfile(conn);
    expect(ini).toBe('[connection]\nid=test\ntype=ethernet\n\n[ipv4]\nmethod=auto');
  });
});
