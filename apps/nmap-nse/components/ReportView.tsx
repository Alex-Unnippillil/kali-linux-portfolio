import React, { useState } from 'react';
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

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav className="text-sm mb-4">
    {items.map((item, idx) => (
      <span key={idx}>
        {idx > 0 && ' / '}
        {item.onClick ? (
          <button
            className="text-blue-400 hover:underline"
            onClick={item.onClick}
            type="button"
          >
            {item.label}
          </button>
        ) : (
          <span>{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

const HostList: React.FC<{ hosts: Host[]; onSelect: (h: Host) => void }> = ({
  hosts,
  onSelect,
}) => (
  <div className="space-y-2">
    {hosts.map((h) => (
      <button
        key={h.address}
        onClick={() => onSelect(h)}
        className="block w-full text-left p-2 bg-gray-800 hover:bg-gray-700 rounded"
        type="button"
      >
        {h.address}
      </button>
    ))}
  </div>
);

const ServiceList: React.FC<{
  host: Host;
  onSelect: (s: Service) => void;
}> = ({ host, onSelect }) => {
  const [note, setNote] = usePersistentState(
    `nmap-nse:note:${host.address}`,
    '',
    (v): v is string => typeof v === 'string'
  );
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">{host.address}</h2>
      <div className="space-y-2 mb-4">
        {host.services.map((s) => (
          <button
            key={s.port}
            onClick={() => onSelect(s)}
            className="block w-full text-left p-2 bg-gray-800 hover:bg-gray-700 rounded"
            type="button"
          >
            {s.port} {s.name}
          </button>
        ))}
      </div>
      {host.vulnerabilities.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold">Host Scripts</h3>
          {host.vulnerabilities.map((v, idx) => (
            <div key={idx} className="ml-2 text-sm text-red-400">
              {v.id}: {v.output}
            </div>
          ))}
        </div>
      )}
      <textarea
        className="w-full p-1 rounded text-black"
        placeholder="Annotations"
        aria-label="Annotations"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  );
};

const ScriptList: React.FC<{ service: Service }> = ({ service }) => (
  <div>
    <h2 className="text-xl font-bold mb-2">
      {service.port} {service.name}
    </h2>
    {service.vulnerabilities.map((v, idx) => (
      <div key={idx} className="mb-4">
        <div className="font-mono text-sm mb-1">{v.id}</div>
        <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
          {v.output}
        </pre>
      </div>
    ))}
    {service.vulnerabilities.length === 0 && <p>No scripts reported.</p>}
  </div>
);

const ReportView: React.FC<{ report: Report }> = ({ report }) => {
  const [host, setHost] = useState<Host | null>(null);
  const [service, setService] = useState<Service | null>(null);

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Hosts',
      onClick: () => {
        setHost(null);
        setService(null);
      },
    },
  ];
  if (host) {
    breadcrumbs.push({ label: host.address, onClick: () => setService(null) });
  }
  if (service) {
    breadcrumbs.push({ label: `${service.port} ${service.name}` });
  }

  let content: React.ReactNode;
  if (!host) {
    content = <HostList hosts={report.hosts} onSelect={setHost} />;
  } else if (!service) {
    content = <ServiceList host={host} onSelect={setService} />;
  } else {
    content = <ScriptList service={service} />;
  }

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      {content}
    </div>
  );
};

export default ReportView;

