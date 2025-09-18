import { parseSubnetCsv, serializeSubnetRows, CSV_HEADERS, SubnetCsvRow } from '../../../apps/subnet-calculator/csv';

describe('subnet calculator CSV helpers', () => {
  const sampleRows: SubnetCsvRow[] = [
    {
      address: '192.0.2.1',
      prefix: 24,
      version: 'IPv4',
      network: '192.0.2.0',
      firstHost: '192.0.2.1',
      lastHost: '192.0.2.254',
      hostCount: '254',
      mask: '255.255.255.0',
      notes: 'v4 row',
    },
    {
      address: '2001:db8::1',
      prefix: 64,
      version: 'IPv6',
      network: '2001:db8::',
      firstHost: '2001:db8::1',
      lastHost: '2001:db8::ffff:ffff:ffff:ffff',
      hostCount: '18446744073709551616',
      mask: 'ffff:ffff:ffff:ffff::',
      notes: 'ipv6 sample',
    },
  ];

  it('serialises and parses rows symmetrically', () => {
    const csv = serializeSubnetRows(sampleRows);
    const [headerLine, ...body] = csv.split('\r\n');
    expect(headerLine).toBe(CSV_HEADERS.join(','));
    expect(body).toHaveLength(sampleRows.length);

    const parsed = parseSubnetCsv(csv);
    expect(parsed).toEqual(sampleRows);
  });

  it('parses CSV with quoted content, BOM, and CRLF endings', () => {
    const csv = [
      '\ufeffAddress,Prefix,Type,Notes',
      '"192.0.2.25", "24", "ipv4", "multi-line\ncomment"',
      '"2001:db8::25",64,IPv6,"quoted, field"',
    ].join('\r\n');

    const parsed = parseSubnetCsv(csv);
    expect(parsed).toEqual([
      {
        address: '192.0.2.25',
        prefix: 24,
        version: 'IPv4',
        notes: 'multi-line\ncomment',
      },
      {
        address: '2001:db8::25',
        prefix: 64,
        version: 'IPv6',
        notes: 'quoted, field',
      },
    ]);
  });

  it('ignores malformed or incomplete rows', () => {
    const csv = [
      'ip,prefix,version,notes',
      '10.0.0.1,,IPv4,missing prefix',
      ',24,IPv4,missing ip',
      'fd00::1,64,ipv6,valid row',
    ].join('\n');

    const parsed = parseSubnetCsv(csv);
    expect(parsed).toEqual([
      {
        address: 'fd00::1',
        prefix: 64,
        version: 'IPv6',
        notes: 'valid row',
      },
    ]);
  });

  it('ignores unknown columns and trims whitespace', () => {
    const csv = [
      'host,maskLength,family,owner,comment',
      '192.168.0.5, 27, ipV4, Alice , " extra space "',
    ].join('\n');

    const parsed = parseSubnetCsv(csv);
    expect(parsed).toEqual([
      {
        address: '192.168.0.5',
        prefix: 27,
        version: 'IPv4',
        notes: 'extra space',
      },
    ]);
  });

  it('escapes commas, quotes and newlines on serialisation', () => {
    const trickyRow: SubnetCsvRow = {
      address: '198.51.100.10',
      prefix: 30,
      version: 'IPv4',
      notes: 'Contains "quotes", comma, and newline\nhere',
    };

    const csv = serializeSubnetRows([trickyRow]);
    const [, dataLine] = csv.split('\r\n');
    expect(dataLine).toBe(
      '198.51.100.10,30,IPv4,,,,,,"Contains ""quotes"", comma, and newline\nhere"',
    );

    const parsed = parseSubnetCsv(csv);
    expect(parsed).toEqual([trickyRow]);
  });
});
