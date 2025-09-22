import React from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export interface Vulnerability {
  id: string;
  output: string;
}

export interface Service {
  port: number;
  name: string;
  vulnerabilities: Vulnerability[];
}

export interface Host {
  address: string;
  services: Service[];
  vulnerabilities: Vulnerability[];
}

export interface Report {
  hosts: Host[];
}

const HostSection: React.FC<{ host: Host }> = ({ host }) => {
  const [note, setNote] = usePersistentState(
    `nmap-nse:note:${host.address}`,
    '',
    (v): v is string => typeof v === 'string'
  );
  return (
    <div className="mb-4 border border-gray-700 p-2 rounded">
      <h3 className="text-lg font-bold mb-2">{host.address}</h3>
      {host.services.map((s) => (
        <div key={s.port} className="ml-4 mb-2">
          <div className="font-mono">
            {s.port} {s.name}
          </div>
          {s.vulnerabilities.map((v, idx) => (
            <div key={idx} className="ml-4 text-sm text-red-400">
              {v.id}: {v.output}
            </div>
          ))}
        </div>
      ))}
      {host.vulnerabilities.length > 0 && (
        <div className="ml-4 text-sm text-red-400 mb-2">
          {host.vulnerabilities.map((v, idx) => (
            <div key={idx}>
              {v.id}: {v.output}
            </div>
          ))}
        </div>
      )}
        <textarea
          className="w-full p-1 rounded text-black"
          placeholder="Annotations"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Host annotations"
        />
    </div>
  );
};

const ReportView: React.FC<{ report: Report }> = ({ report }) => (
  <div>
    {report.hosts.map((h) => (
      <HostSection key={h.address} host={h} />
    ))}
  </div>
);

export default ReportView;

