import {
  escapeCsvValue,
  KismetCsvColumn,
  serializeVisibleSnapshotToCsv,
} from '../../../components/apps/kismet/export';

type TestRow = {
  ssid: string;
  bssid: string;
  channel: number | string;
  frames: number;
};

const createColumns = (): KismetCsvColumn<TestRow>[] => [
  {
    id: 'ssid',
    label: 'SSID',
    getValue: (row) => row.ssid,
  },
  {
    id: 'bssid',
    label: 'BSSID',
    getValue: (row) => row.bssid,
  },
  {
    id: 'channel',
    label: 'Channel',
    getValue: (row) => row.channel,
  },
  {
    id: 'frames',
    label: 'Frames',
    getValue: (row) => row.frames,
  },
];

describe('kismet CSV export', () => {
  it('serializes visible rows in their current order', () => {
    const columns = createColumns().slice(0, 3);
    const rows: TestRow[] = [
      { ssid: 'Cafe', bssid: '00:11:22:33:44:55', channel: 6, frames: 10 },
      { ssid: 'Home', bssid: 'aa:bb:cc:dd:ee:ff', channel: 11, frames: 20 },
    ];

    const csv = serializeVisibleSnapshotToCsv({ columns, rows });

    expect(csv).toBe('SSID,BSSID,Channel\nCafe,00:11:22:33:44:55,6\nHome,aa:bb:cc:dd:ee:ff,11');
  });

  it('escapes values containing commas, quotes or new lines', () => {
    const columns = createColumns();
    const rows: TestRow[] = [
      {
        ssid: 'Office, WiFi',
        bssid: '"escaped"',
        channel: '10\n11',
        frames: 42,
      },
    ];

    const csv = serializeVisibleSnapshotToCsv({ columns, rows });

    expect(csv).toBe(
      'SSID,BSSID,Channel,Frames\n"Office, WiFi","""escaped""","10\n11",42',
    );
  });

  it('returns an empty string when no columns are visible', () => {
    const csv = serializeVisibleSnapshotToCsv({ columns: [], rows: [] });
    expect(csv).toBe('');
  });

  it('handles null and undefined values', () => {
    const columns: KismetCsvColumn<TestRow>[] = [
      {
        id: 'ssid',
        label: 'SSID',
        getValue: () => undefined,
      },
      {
        id: 'frames',
        label: 'Frames',
        getValue: () => null,
      },
    ];

    const csv = serializeVisibleSnapshotToCsv({
      columns,
      rows: [{ ssid: '', bssid: '', channel: '-', frames: 0 }],
    });

    expect(csv).toBe('SSID,Frames\n,');
  });
});

describe('escapeCsvValue', () => {
  it('stringifies arrays and nested objects', () => {
    expect(escapeCsvValue(['a', 'b'])).toBe('a; b');
    expect(escapeCsvValue({ nested: true })).toBe('"{""nested"":true}"');
  });
});
