import {
  IncidentRecord,
  formatIncidentLog,
  incidentsToCsv,
  incidentsToJson,
} from '../apps/resource-monitor/incidents';

const sampleIncident: IncidentRecord = {
  id: 42,
  start: '2024-03-01T10:00',
  end: '2024-03-01T11:00',
  impact: 'High',
  notes: 'Elevated error rate observed in EU region',
  createdAt: '2024-03-01T11:05:00.000Z',
  correlationId: 'abc-123',
};

describe('ops dashboard exports', () => {
  it('formats incidents using logger structure', () => {
    const entry = formatIncidentLog(sampleIncident);
    expect(entry).toEqual({
      level: 'info',
      message: 'ops.incident.recorded',
      correlationId: sampleIncident.correlationId,
      incidentId: sampleIncident.id,
      start: sampleIncident.start,
      end: sampleIncident.end,
      impact: sampleIncident.impact,
      notes: sampleIncident.notes,
      createdAt: sampleIncident.createdAt,
    });
  });

  it('exports incidents to JSON with logger formatting', () => {
    const json = incidentsToJson([sampleIncident]);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual([formatIncidentLog(sampleIncident)]);
  });

  it('exports incidents to CSV with expected headers and rows', () => {
    const csv = incidentsToCsv([sampleIncident]);
    const [header, row] = csv.split('\n');
    expect(header).toBe('level,message,correlationId,incidentId,start,end,impact,notes,createdAt');
    expect(row).toBe(
      [
        'info',
        'ops.incident.recorded',
        sampleIncident.correlationId,
        String(sampleIncident.id),
        sampleIncident.start,
        sampleIncident.end,
        sampleIncident.impact,
        sampleIncident.notes,
        sampleIncident.createdAt,
      ].join(','),
    );
  });
});
