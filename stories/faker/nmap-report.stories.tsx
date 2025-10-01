import React from 'react';
import ReportView from '../../apps/nmap-nse/components/ReportView';
import { generateServiceReport } from '@/utils/faker/services';
import { NMAP_NSE_FALLBACK_SEED } from '../../components/apps/nmap-nse';

const serviceReport = generateServiceReport({
  seed: NMAP_NSE_FALLBACK_SEED,
});

const storyReport = {
  hosts: serviceReport.hosts.map((host) => ({
    address: host.ip,
    services: host.ports.map((port) => ({
      port: port.port,
      name: port.service,
      vulnerabilities: port.scripts.map((script) => ({
        id: script.name,
        output: script.output,
      })),
    })),
    vulnerabilities: [],
  })),
};

const meta = {
  title: 'Faker/Nmap/ReportView',
  component: ReportView,
};

export default meta;

export const Default = () => <ReportView report={storyReport} />;
