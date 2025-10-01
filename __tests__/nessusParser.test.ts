import { TransformStream } from 'stream/web';
import { parseNessus } from '../workers/nessus-parser';

if (typeof (globalThis as any).TransformStream === 'undefined') {
  (globalThis as any).TransformStream = TransformStream;
}

describe('nessus parser worker', () => {
  test('extracts findings with description and solution', async () => {
    const sample = `<?xml version="1.0"?>
<NessusClientData_v2>
  <Report name="Sample">
    <ReportHost name="192.168.0.1">
      <HostProperties>
        <tag name="host-ip">192.168.0.1</tag>
      </HostProperties>
      <ReportItem pluginID="100" pluginName="Test Vuln">
        <risk_factor>Low</risk_factor>
        <description>Some description</description>
        <solution>Apply patch</solution>
        <cvss_base_score>4.0</cvss_base_score>
      </ReportItem>
    </ReportHost>
  </Report>
</NessusClientData_v2>`;
    const findings = await parseNessus(sample);
    expect(findings).toEqual([
      {
        host: '192.168.0.1',
        id: '100',
        name: 'Test Vuln',
        cvss: 4.0,
        severity: 'Low',
        description: 'Some description',
        solution: 'Apply patch',
      },
    ]);
  });
});
