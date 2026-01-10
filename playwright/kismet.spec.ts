import { expect, test } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

const MB = 1024 * 1024;

type Network = {
  ssid: string;
  bssid: string;
  channel: number;
};

type Packet = {
  timestamp: number;
  network: Network;
};

const threeMinuteCapture: Packet[] = [
  { timestamp: 0, network: { ssid: 'CafeWiFi', bssid: '00:11:22:33:44:55', channel: 6 } },
  { timestamp: 30, network: { ssid: 'CafeWiFi', bssid: '00:11:22:33:44:55', channel: 6 } },
  { timestamp: 60, network: { ssid: 'Airport', bssid: '66:77:88:99:aa:bb', channel: 1 } },
  { timestamp: 90, network: { ssid: 'Office5G', bssid: 'aa:bb:cc:dd:ee:ff', channel: 36 } },
  { timestamp: 120, network: { ssid: 'CafeWiFi', bssid: '00:11:22:33:44:55', channel: 6 } },
  { timestamp: 150, network: { ssid: 'Airport', bssid: '66:77:88:99:aa:bb', channel: 1 } },
  { timestamp: 180, network: { ssid: 'Office5G', bssid: 'aa:bb:cc:dd:ee:ff', channel: 36 } },
];

const macToBuffer = (mac: string): Buffer => {
  const parts = mac.split(':');
  if (parts.length !== 6) {
    throw new Error(`Invalid MAC address: ${mac}`);
  }
  return Buffer.from(parts.map((part) => parseInt(part, 16)));
};

const buildManagementFrame = ({ ssid, bssid, channel }: Network): Buffer => {
  const ssidBytes = Buffer.from(ssid, 'utf8');
  const tags = Buffer.concat([
    Buffer.from([0x00, ssidBytes.length]),
    ssidBytes,
    Buffer.from([0x03, 0x01, channel]),
  ]);

  const frame = Buffer.alloc(36 + tags.length);
  frame[0] = 0x80; // beacon frame
  frame[1] = 0x00;
  // duration
  frame[2] = 0x00;
  frame[3] = 0x00;

  const broadcast = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  broadcast.copy(frame, 4); // destination

  const bssidBytes = macToBuffer(bssid);
  bssidBytes.copy(frame, 10); // source
  bssidBytes.copy(frame, 16); // bssid

  frame[22] = 0x00;
  frame[23] = 0x00; // sequence control

  // fixed parameters
  frame.writeBigUInt64LE(BigInt(0), 24);
  frame.writeUInt16LE(100, 32); // beacon interval
  frame.writeUInt16LE(0x0000, 34); // capability info

  tags.copy(frame, 36);
  return frame;
};

const buildPacket = ({ timestamp, network }: Packet): Buffer => {
  const frame = buildManagementFrame(network);
  const radiotap = Buffer.from([0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const payload = Buffer.concat([radiotap, frame]);

  const header = Buffer.alloc(16);
  header.writeUInt32LE(timestamp, 0);
  header.writeUInt32LE(0, 4);
  header.writeUInt32LE(payload.length, 8);
  header.writeUInt32LE(payload.length, 12);

  return Buffer.concat([header, payload]);
};

const createThreeMinutePcap = (): { name: string; mimeType: string; buffer: Buffer } => {
  const globalHeader = Buffer.alloc(24);
  globalHeader.writeUInt32LE(0xa1b2c3d4, 0);
  globalHeader.writeUInt16LE(2, 4);
  globalHeader.writeUInt16LE(4, 6);
  globalHeader.writeInt32LE(0, 8);
  globalHeader.writeUInt32LE(0, 12);
  globalHeader.writeUInt32LE(65535, 16);
  globalHeader.writeUInt32LE(127, 20); // LINKTYPE_IEEE802_11_RADIOTAP

  const packets = threeMinuteCapture.map(buildPacket);
  const buffer = Buffer.concat([globalHeader, ...packets]);

  return {
    name: 'kismet-three-minute-scan.pcap',
    mimeType: 'application/octet-stream',
    buffer,
  };
};

test('Kismet simulated scan cleans up timers and memory', async ({ browserName, context, page }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Heap snapshots are only supported on Chromium.');

  await page.addInitScript(() => {
    const activeIntervals = new Set<number>();
    const activeRafs = new Set<number>();

    const originalSetInterval = window.setInterval.bind(window);
    const originalClearInterval = window.clearInterval.bind(window);
    window.setInterval = ((...args: Parameters<typeof originalSetInterval>) => {
      const id = originalSetInterval(...args);
      activeIntervals.add(id);
      return id;
    }) as typeof window.setInterval;
    window.clearInterval = ((id: number | undefined) => {
      if (typeof id === 'number') {
        activeIntervals.delete(id);
      }
      return originalClearInterval(id);
    }) as typeof window.clearInterval;

    const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    const originalCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      let rafId = 0;
      const wrapped = (time: DOMHighResTimeStamp) => {
        activeRafs.delete(rafId);
        callback(time);
      };
      rafId = originalRequestAnimationFrame(wrapped);
      activeRafs.add(rafId);
      return rafId;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => {
      activeRafs.delete(id);
      return originalCancelAnimationFrame(id);
    }) as typeof window.cancelAnimationFrame;

    (window as unknown as Record<string, unknown>).__activeIntervals = activeIntervals;
    (window as unknown as Record<string, unknown>).__activeRafs = activeRafs;
  });

  const leakLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (/leak/i.test(text)) {
      leakLogs.push(text);
    }
  });

  const client = await context.newCDPSession(page);
  await client.send('HeapProfiler.enable');

  const captureHeapSnapshot = async (label: string) => {
    const chunks: string[] = [];
    const handler = ({ chunk }: { chunk: string }) => {
      chunks.push(chunk);
    };
    client.on('HeapProfiler.addHeapSnapshotChunk', handler);
    await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
    client.off('HeapProfiler.addHeapSnapshotChunk', handler);
    const snapshotPath = path.join(testInfo.outputDir, `${label}.heapsnapshot`);
    await fs.writeFile(snapshotPath, chunks.join(''));
    return snapshotPath;
  };

  const getHeapUsage = async () => {
    const usage = await client.send('Runtime.getHeapUsage');
    return usage.usedSize as number;
  };

  await page.goto('/');
  await page.locator('#desktop').waitFor({ state: 'visible' });

  const baselineTimers = await page.evaluate(() => ({
    intervals: (window as unknown as { __activeIntervals?: Set<number> }).__activeIntervals?.size ?? 0,
    rafs: (window as unknown as { __activeRafs?: Set<number> }).__activeRafs?.size ?? 0,
  }));

  await page.getByAltText('Ubuntu view app').click();
  const kismetTile = page.getByRole('button', { name: 'Kismet' });
  await kismetTile.waitFor({ state: 'visible' });
  await kismetTile.dblclick();

  const kismetWindow = page.locator('#kismet');
  await expect(kismetWindow).toBeVisible();

  await captureHeapSnapshot('baseline');
  const baselineHeapUsage = await getHeapUsage();

  const filePayload = createThreeMinutePcap();
  await kismetWindow.locator('input[aria-label="pcap file"]').setInputFiles(filePayload);

  const networksTable = kismetWindow.locator('table[aria-label="Networks"]');
  await expect(networksTable).toBeVisible();
  const rows = networksTable.locator('tbody tr');
  await expect(rows).toHaveCount(3);

  const networkData = await rows.evaluateAll((elements) =>
    elements.map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''),
    ),
  );
  expect(networkData).toEqual([
    ['CafeWiFi', '00:11:22:33:44:55', '6', '3'],
    ['Airport', '66:77:88:99:aa:bb', '1', '2'],
    ['Office5G', 'aa:bb:cc:dd:ee:ff', '36', '2'],
  ]);

  await expect(kismetWindow.getByRole('heading', { name: 'Channels' })).toBeVisible();
  const channelLabels = await kismetWindow
    .locator('div[aria-label="Channel chart"] [role="img"]')
    .evaluateAll((elements) => elements.map((el) => el.getAttribute('aria-label')));
  expect(channelLabels).toEqual(
    expect.arrayContaining([
      'Channel 6 has 3 networks',
      'Channel 1 has 2 networks',
      'Channel 36 has 2 networks',
    ]),
  );

  const timePath = await kismetWindow
    .locator('svg[aria-label="Time chart"] path')
    .getAttribute('d');
  expect(timePath).toBeTruthy();
  const pointCount = timePath?.split(/[ML]/).filter((segment) => segment.trim().length > 0).length ?? 0;
  expect(pointCount).toBe(7);

  const downloadPromise = page.waitForEvent('download');
  const exportedCsv = await kismetWindow.evaluate(() => {
    const table = document.querySelector('table[aria-label="Networks"]');
    if (!table) throw new Error('Network table missing for export');
    const rows = Array.from(table.querySelectorAll('tr'));
    const csv = rows
      .map((row) =>
        Array.from(row.querySelectorAll('th,td'))
          .map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim())
          .join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kismet-export.csv';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, 0);
    return csv;
  });
  const download = await downloadPromise;
  const exportPath = path.join(testInfo.outputDir, 'kismet-export.csv');
  await download.saveAs(exportPath);
  const savedCsv = await fs.readFile(exportPath, 'utf-8');
  await download.delete();
  expect(savedCsv.trim()).toBe(exportedCsv.trim());
  expect(exportedCsv).toContain('SSID,BSSID,Channel,Frames');

  const postScanUsage = await getHeapUsage();
  expect(postScanUsage).toBeGreaterThanOrEqual(baselineHeapUsage);

  await kismetWindow.getByRole('button', { name: 'Window close' }).click();
  await expect(kismetWindow).not.toBeVisible();
  await page.waitForTimeout(150);

  await captureHeapSnapshot('post-close');
  const postCloseHeapUsage = await getHeapUsage();
  expect(postCloseHeapUsage).toBeLessThanOrEqual(baselineHeapUsage + 6 * MB);

  const finalTimers = await page.evaluate(() => ({
    intervals: (window as unknown as { __activeIntervals?: Set<number> }).__activeIntervals?.size ?? 0,
    rafs: (window as unknown as { __activeRafs?: Set<number> }).__activeRafs?.size ?? 0,
  }));
  expect(finalTimers.intervals).toBe(baselineTimers.intervals);
  expect(finalTimers.rafs).toBe(baselineTimers.rafs);

  expect(leakLogs).toHaveLength(0);

  await client.send('HeapProfiler.disable');
});
