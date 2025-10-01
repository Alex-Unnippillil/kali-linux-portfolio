import { createSeededRandom } from './random';

export interface FakeServiceScript {
  name: string;
  output: string;
}

export interface FakeServicePort {
  port: number;
  service: string;
  product: string;
  state: 'open' | 'filtered';
  cvss: number;
  scripts: FakeServiceScript[];
  summary: string;
}

export interface FakeHost {
  ip: string;
  hostname: string;
  os: string;
  notes: string[];
  ports: FakeServicePort[];
}

export interface ServiceReport {
  hosts: FakeHost[];
  scriptExamples: Record<string, string>;
}

export interface ServiceReportOptions {
  seed?: string | number;
  hostCount?: number;
}

export const DEFAULT_SERVICE_SEED = 'service-report-demo';

interface TemplateContext {
  hostname: string;
  ip: string;
  port: number;
  product: string;
  os: string;
  workgroup: string;
  rngValue(): number;
  fingerprint(prefix: string): string;
  isoDate(offsetDays: number): string;
  certificateDate(offsetDays: number): string;
  size(): string;
  year: string;
  path: string;
  version: string;
  securityType: string;
  bannerCode: string;
}

type ScriptTemplate = (ctx: TemplateContext) => FakeServiceScript;

type ProductFactory = (rngValue: () => number) => string;

type ServiceTemplate = {
  port: number;
  service: string;
  products: ProductFactory[];
  scripts: ScriptTemplate[];
  summary: (ctx: TemplateContext) => string;
};

const hostnames = [
  'lab-gateway',
  'workstation-01',
  'intranet-cache',
  'audit-proxy',
  'dev-db',
  'sensor-hub',
];

const operatingSystems = [
  'Debian GNU/Linux 12',
  'Ubuntu Server 22.04',
  'Kali Linux 2024.2',
  'Windows Server 2019',
  'Windows 11 Pro',
];

const workgroups = ['LABNET', 'ACME', 'WORKGROUP'];
const paths = ['status', 'dashboard', 'metrics', 'health', 'console'];
const securityTypes = ['None', 'VNC Authentication', 'TightAuth'];
const bannerCodes = ['220', '250'];

const certificateBase = Date.UTC(2024, 0, 1, 9, 30, 0);

const isoDate = (base: number, offsetDays: number) =>
  new Date(base + offsetDays * 24 * 60 * 60 * 1000).toISOString();

const toFingerprint = (prefix: string, value: string) => `${prefix}:${value}`;

const serviceTemplates: ServiceTemplate[] = [
  {
    port: 22,
    service: 'ssh',
    products: [
      () => 'OpenSSH 9.3p1 Debian',
      () => 'OpenSSH 8.9p1 Ubuntu',
      () => 'Dropbear sshd 2022.82',
    ],
    scripts: [
      (ctx) => ({
        name: 'ssh2-enum-algos',
        output: `| ssh2-enum-algos:\n|   kex_algorithms: curve25519-sha256@libssh.org\n|   server_host_key_algorithms: ssh-ed25519\n|_  encryption_algorithms: chacha20-poly1305@openssh.com`,
      }),
      (ctx) => ({
        name: 'ssh-hostkey',
        output: `| ssh-hostkey:\n|   256 ${ctx.fingerprint('SHA256')}\n|_  256 ${ctx.fingerprint('SHA1')}`,
      }),
    ],
    summary: (ctx) => `${ctx.product} service announcing modern key exchange`,
  },
  {
    port: 80,
    service: 'http',
    products: [
      () => 'nginx 1.24.0',
      () => 'Apache httpd 2.4.57',
      () => 'Caddy 2.7.4',
    ],
    scripts: [
      (ctx) => ({
        name: 'http-title',
        output: `${ctx.port}/tcp open  http\n| http-title: ${ctx.hostname} web console\n|_Requested resource was /${ctx.path}`,
      }),
      (ctx) => ({
        name: 'http-server-header',
        output: `| http-server-header: ${ctx.product}\n|_http-methods: GET HEAD OPTIONS`,
      }),
    ],
    summary: (ctx) => `${ctx.product} exposing ${ctx.hostname} portal`,
  },
  {
    port: 443,
    service: 'https',
    products: [
      () => 'nginx 1.24.0',
      () => 'Apache httpd 2.4.58',
      () => 'Envoy 1.29',
    ],
    scripts: [
      (ctx) => ({
        name: 'ssl-cert',
        output: `| ssl-cert: Subject: commonName=${ctx.hostname}\n| Subject Alternative Name: DNS:${ctx.hostname}\n|_Not valid before: ${ctx.certificateDate(-30)} Not valid after: ${ctx.certificateDate(335)}`,
      }),
      () => ({
        name: 'tls-alpn',
        output: `| tls-alpn:\n|   http/1.1\n|_  h2`,
      }),
    ],
    summary: (ctx) => `${ctx.product} with valid certificate for ${ctx.hostname}`,
  },
  {
    port: 445,
    service: 'microsoft-ds',
    products: [
      () => 'Samba smbd 4.17.9',
      () => 'Windows 10 Pro 19045',
    ],
    scripts: [
      (ctx) => ({
        name: 'smb-os-discovery',
        output: `| smb-os-discovery:\n|   OS: ${ctx.os}\n|   Computer name: ${ctx.hostname}\n|_  Workgroup: ${ctx.workgroup}`,
      }),
      (ctx) => ({
        name: 'smb2-time',
        output: `| smb2-time:\n|   date: ${ctx.isoDate(0)}\n|_  start_date: ${ctx.isoDate(-2)}`,
      }),
    ],
    summary: (ctx) => `${ctx.product} fileshare joined to ${ctx.workgroup}`,
  },
  {
    port: 53,
    service: 'domain',
    products: [
      () => 'dnsmasq 2.89',
      () => 'BIND 9.18.11',
    ],
    scripts: [
      (ctx) => ({
        name: 'dns-nsid',
        output: `| dns-nsid:\n|_  bind.version: ${ctx.product}`,
      }),
    ],
    summary: (ctx) => `${ctx.product} answering recursive queries`,
  },
  {
    port: 21,
    service: 'ftp',
    products: [
      () => 'vsftpd 3.0.5',
      () => 'Pure-FTPd 1.0.49',
    ],
    scripts: [
      (ctx) => ({
        name: 'ftp-anon',
        output: `| ftp-anon: Anonymous FTP login allowed (230)\n|_drwxr-xr-x   1 ftp      ftp            ${ctx.size()} Mar 01  ${ctx.year}`,
      }),
    ],
    summary: (ctx) => `${ctx.product} permitting anonymous listing`,
  },
  {
    port: 3389,
    service: 'ms-wbt-server',
    products: [
      () => 'Windows RDP 10.0',
      () => 'FreeRDP Gateway',
    ],
    scripts: [
      (ctx) => ({
        name: 'rdp-ntlm-info',
        output: `| rdp-ntlm-info:\n|   Target_Name: ${ctx.workgroup}\n|_  Product_Version: ${ctx.version}`,
      }),
    ],
    summary: (ctx) => `${ctx.product} exposing remote desktop`,
  },
  {
    port: 5900,
    service: 'vnc',
    products: [
      () => 'RealVNC 5.3',
      () => 'x11vnc 0.9.16',
    ],
    scripts: [
      (ctx) => ({
        name: 'vnc-info',
        output: `| vnc-info:\n|   Protocol version: 3.8\n|_  Security types: ${ctx.securityType}`,
      }),
    ],
    summary: (ctx) => `${ctx.product} waiting for VNC clients`,
  },
  {
    port: 25,
    service: 'smtp',
    products: [
      () => 'Postfix smtpd',
      () => 'Exim 4.96',
    ],
    scripts: [
      (ctx) => ({
        name: 'smtp-commands',
        output: `| smtp-commands: ${ctx.hostname} ${ctx.version}, PIPELINING, STARTTLS, AUTH PLAIN LOGIN\n|_${ctx.hostname} ${ctx.bannerCode} Enhanced SMTP ready`,
      }),
    ],
    summary: (ctx) => `${ctx.product} advertising authenticated relay`,
  },
];

const toTemplateContext = (
  host: FakeHost,
  product: string,
  rngValue: () => number,
  service: ServiceTemplate,
): TemplateContext => {
  const fingerprintValue = () => {
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(rngValue() * 16).toString(16)
    ).join('');
    return randomHex;
  };
  return {
    hostname: host.hostname,
    ip: host.ip,
    port: service.port,
    product,
    os: host.os,
    workgroup: host.notes[0] || workgroups[0],
    rngValue,
    fingerprint: (prefix) => toFingerprint(prefix, fingerprintValue()),
    isoDate: (offset) => isoDate(certificateBase, offset),
    certificateDate: (offset) => isoDate(certificateBase, offset),
    size: () => (4096 + Math.floor(rngValue() * 2048)).toString(),
    year: new Date().getFullYear().toString(),
    path: paths[Math.floor(rngValue() * paths.length)],
    version: `10.${Math.floor(rngValue() * 2)}.${Math.floor(rngValue() * 9000 + 1000)}`,
    securityType: securityTypes[Math.floor(rngValue() * securityTypes.length)],
    bannerCode: bannerCodes[Math.floor(rngValue() * bannerCodes.length)],
  };
};

const createHost = (rng = createSeededRandom(DEFAULT_SERVICE_SEED)) => {
  const host: FakeHost = {
    ip: `${rng.pick(['10.0.5', '10.0.8', '192.168.56'])}.${rng.int(2, 240)}`,
    hostname: rng.pick(hostnames),
    os: rng.pick(operatingSystems),
    notes: [rng.pick(workgroups)],
    ports: [],
  };
  return host;
};

const roundCvss = (value: number) => Math.round(value * 10) / 10;

export const generateServiceReport = (
  options: ServiceReportOptions = {}
): ServiceReport => {
  const { seed = DEFAULT_SERVICE_SEED, hostCount = 3 } = options;
  const rng = createSeededRandom(seed);
  const hosts: FakeHost[] = [];
  const scriptExamples: Record<string, string> = {};

  for (let i = 0; i < hostCount; i += 1) {
    const host = createHost(rng);
    const services = rng.sampleSize(serviceTemplates, rng.int(2, 4));
    host.ports = services.map((service) => {
      const productFactory = rng.pick(service.products);
      const product = productFactory(rng.next);
      const ctx = toTemplateContext(host, product, rng.next, service);
      const scripts = service.scripts.map((template) => template(ctx));
      scripts.forEach((script) => {
        if (!scriptExamples[script.name]) {
          scriptExamples[script.name] = script.output;
        }
      });
      return {
        port: service.port,
        service: service.service,
        product,
        state: 'open' as const,
        cvss: roundCvss(3 + rng.next() * 4),
        scripts,
        summary: service.summary(ctx),
      };
    });
    hosts.push(host);
  }

  return { hosts, scriptExamples };
};

export const cloneServiceReport = (report: ServiceReport): ServiceReport => ({
  hosts: report.hosts.map((host) => ({
    ...host,
    ports: host.ports.map((port) => ({
      ...port,
      scripts: port.scripts.map((script) => ({ ...script })),
    })),
  })),
  scriptExamples: { ...report.scriptExamples },
});
