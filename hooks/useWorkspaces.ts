import { useCallback, useMemo } from 'react';

export type WorkspaceSeverity =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Informational';

export interface WorkspaceFinding {
  id: string;
  title: string;
  severity: WorkspaceSeverity;
  description: string;
}

export interface WorkspaceEvidenceHint {
  title: string;
  summary: string;
  reference?: string;
}

export interface WorkspaceMetadata {
  id: string;
  name: string;
  client: string;
  industry: string;
  engagementLead: string;
  status: string;
  lastUpdated: string;
  environment: string;
  scope: string[];
  focus: string[];
  summary: string;
  defaultExecutiveSummary: string;
  defaultRemediation: string;
  findings: WorkspaceFinding[];
  evidenceHints: WorkspaceEvidenceHint[];
  reportingDeadline: string;
  primaryContact: string;
  tags: string[];
}

export const useWorkspaces = () => {
  const workspaces = useMemo<WorkspaceMetadata[]>(
    () => [
      {
        id: 'acme-web-perimeter',
        name: 'ACME Corp Web Perimeter',
        client: 'ACME Corporation',
        industry: 'E-commerce',
        engagementLead: 'Casey Morgan',
        status: 'Reporting',
        lastUpdated: '2024-04-12',
        environment: 'External web applications across Azure and on-premise DMZ nodes.',
        scope: ['Customer portal', 'Checkout microservice', 'Marketing site'],
        focus: ['PCI DSS attestation', 'OWASP Top 10 coverage', 'Attack surface reduction'],
        summary:
          'Q2 assessment focused on validating ACME\'s customer-facing assets remain hardened after the checkout re-platform. Web tier hosts are segmented but application flaws were identified.',
        defaultExecutiveSummary:
          'During the April 2024 assessment of ACME\'s web perimeter we identified three material issues that reduce the confidentiality of payment workflows. An unauthenticated SQL injection in the checkout API provided direct database access, a publicly exposed Jenkins node leaked deployment credentials, and multiple servers still advertise deprecated TLS 1.0 ciphers. Immediate containment steps limited abuse, but long-term remediation is required to sustain the organisation\'s PCI posture.',
        defaultRemediation:
          'Immediate actions: disable public access to the legacy Jenkins endpoint and rotate exposed service credentials. Deploy a web application firewall rule-set to mitigate the checkout SQL injection until code fixes are released.\n\nNear term: refactor the order submission endpoint to use parameterised queries and add regression tests for injection. Harden build infrastructure behind VPN access with SSO and enforce TLS 1.2+ across the load balancers.\n\nLong term: integrate continuous dependency checks into the CI/CD pipeline and extend offensive security validation to each sprint via automated DAST hooks.',
        findings: [
          {
            id: 'acme-finding-1',
            title: 'Unauthenticated SQL injection in checkout workflow',
            severity: 'Critical',
            description:
              'The POST /api/cart/submit endpoint concatenates the orderId parameter without sanitisation. Proof-of-concept UNION payloads extracted customer PII, demonstrating total compromise of the payments database.',
          },
          {
            id: 'acme-finding-2',
            title: 'Public Jenkins instance with default credentials',
            severity: 'High',
            description:
              'A forgotten Jenkins server (build-legacy.acme.example) remains Internet accessible with default admin credentials. The instance exposes deployment pipelines and secrets for production services.',
          },
          {
            id: 'acme-finding-3',
            title: 'TLS 1.0 support on external load balancers',
            severity: 'Medium',
            description:
              'Two F5 load balancers (lb1.acme.example, lb2.acme.example) continue to advertise TLS 1.0 / weak cipher suites. Vulnerability scanners will continue to flag this as non-compliant for PCI DSS.',
          },
        ],
        evidenceHints: [
          {
            title: 'SQLi database dump excerpt',
            summary: 'Screenshot of sqlmap output exfiltrating masked customer records from the orders table.',
            reference: 'sqlmap-output.png',
          },
          {
            title: 'Jenkins access log',
            summary: 'HTTP log snippet showing successful login with default admin credentials and accessible pipelines.',
          },
          {
            title: 'Load balancer cipher scan',
            summary: 'nmap --script ssl-enum-ciphers output demonstrating TLS 1.0 availability.',
          },
        ],
        reportingDeadline: '2024-04-19',
        primaryContact: 'jo.walters@acme.example',
        tags: ['web', 'external', 'pci', 'appsec'],
      },
      {
        id: 'globex-cloud-review',
        name: 'Globex Cloud Posture Review',
        client: 'Globex Corporation',
        industry: 'SaaS',
        engagementLead: 'Priya Natarajan',
        status: 'Validation',
        lastUpdated: '2024-03-28',
        environment: 'AWS multi-account environment with Terraform IaC pipeline.',
        scope: ['Production VPC', 'Terraform modules', 'CI/CD pipeline'],
        focus: ['Cloud misconfiguration', 'Identity governance', 'IaC drift'],
        summary:
          'Engagement assessed Globex\'s AWS posture after rapid expansion into two new regions. The review combined control mapping, Terraform code inspection, and attack path enumeration for privileged identities.',
        defaultExecutiveSummary:
          'Globex maintains strong baseline guardrails, yet we observed three medium-to-high risk gaps affecting identity hygiene and storage controls. Over-permissive IAM policies allow lateral movement into logging accounts, a misconfigured S3 bucket exposes build artifacts, and Terraform modules lack default encryption statements. These weaknesses could enable an attacker with limited foothold to access customer telemetry data.',
        defaultRemediation:
          'Immediate: apply SCP restrictions to prevent iam:PassRole on the analytics-admin role and enable bucket versioning with KMS enforcement.\n\nMedium term: refactor Terraform modules to declare aws_kms_key usage for every S3 bucket and rerun plan/apply with drift detection. Implement automated checks in the pipeline to fail builds when resources omit encryption or logging.\n\nLong term: adopt AWS Identity Center for administrators and enforce session tagging so detective controls can reason about elevated activity.',
        findings: [
          {
            id: 'globex-finding-1',
            title: 'Analytics admin role allows privilege escalation',
            severity: 'High',
            description:
              'The analytics-admin IAM role can pass itself to Lambda functions and EC2 instances. Combined with existing CloudWatch permissions this enables attackers to assume persistent admin access.',
          },
          {
            id: 'globex-finding-2',
            title: 'Unencrypted artifact storage bucket',
            severity: 'Medium',
            description:
              'The s3://globex-artifacts bucket is world-readable due to an inherited ACL and lacks default encryption, exposing build outputs with customer identifiers.',
          },
          {
            id: 'globex-finding-3',
            title: 'Terraform modules missing encryption defaults',
            severity: 'Low',
            description:
              'Several reusable Terraform modules omit server-side encryption blocks. Consumers frequently copy the modules without adding encryption statements, propagating the weakness.',
          },
        ],
        evidenceHints: [
          {
            title: 'IAM access advisor screenshot',
            summary: 'Console capture showing iam:PassRole privilege granted to analytics-admin.',
          },
          {
            title: 'S3 bucket policy JSON',
            summary: 'Redacted JSON snippet illustrating public-read ACL on globex-artifacts bucket.',
          },
          {
            title: 'Terraform plan output',
            summary: 'Plan excerpt highlighting resources created without aws_kms_key references.',
          },
        ],
        reportingDeadline: '2024-04-05',
        primaryContact: 'security@globex.example',
        tags: ['cloud', 'aws', 'iac', 'identity'],
      },
      {
        id: 'initech-internal-review',
        name: 'Initech Internal Network Review',
        client: 'Initech',
        industry: 'Fintech',
        engagementLead: 'Miguel Alvarez',
        status: 'Fieldwork',
        lastUpdated: '2024-04-15',
        environment: 'Hybrid AD/Azure AD environment covering corporate offices and VPN users.',
        scope: ['Active Directory', 'Endpoint build baseline', 'Remote access gateways'],
        focus: ['Credential theft resilience', 'Patch cadence', 'Zero trust rollout'],
        summary:
          'Assessment validated the effectiveness of Initech\'s zero trust rollout. Domain controllers are patched but legacy SMB services remain exposed to VPN clients, and MFA gaps persist for privileged groups.',
        defaultExecutiveSummary:
          'Initech\'s defence-in-depth programme is progressing, yet we observed vulnerabilities that allow credential replay and lateral movement from VPN-connected laptops. SMB signing is disabled on several finance servers, two service accounts retain weak NTLM hashes, and the legacy VPN gateway still issues split-tunnel profiles. Addressing these gaps will improve ransomware resistance and protect high-value payment systems.',
        defaultRemediation:
          'Immediate: enforce MFA for the finance-admin and ops-admin groups, and disable split tunnelling on the legacy VPN concentrator.\n\nNear term: enable SMB signing and channel binding on finance file servers, rotate weak service account passwords, and expand Defender for Endpoint coverage to contractor laptops.\n\nLong term: complete conditional access rollout for privileged groups and decommission unsupported Windows Server 2012 hosts.',
        findings: [
          {
            id: 'initech-finding-1',
            title: 'SMB signing disabled on finance servers',
            severity: 'High',
            description:
              'Finance file servers FIN-FS1 and FIN-FS2 disable SMB signing, enabling relay attacks from any VPN client with network access.',
          },
          {
            id: 'initech-finding-2',
            title: 'Weak service account credentials',
            severity: 'Medium',
            description:
              'Service accounts svc-print and svc-scada still use passwords last rotated in 2018 and are vulnerable to cracking from captured NTLM hashes.',
          },
          {
            id: 'initech-finding-3',
            title: 'Legacy VPN split tunnel policy',
            severity: 'Low',
            description:
              'Remote clients connected to vpn-legacy.initech.example receive split tunnel routes, permitting unmanaged internet egress and reducing monitoring visibility.',
          },
        ],
        evidenceHints: [
          {
            title: 'Responder capture log',
            summary: 'Evidence of captured NTLMv2 hash relays during lab testing.',
          },
          {
            title: 'VPN configuration export',
            summary: 'Screenshot of split-tunnel policy assigned to contractor profile.',
          },
        ],
        reportingDeadline: '2024-04-22',
        primaryContact: 'alice.chen@initech.example',
        tags: ['internal', 'zero-trust', 'active-directory'],
      },
    ],
    [],
  );

  const getWorkspaceById = useCallback(
    (id: string) => workspaces.find((ws) => ws.id === id),
    [workspaces],
  );

  return { workspaces, getWorkspaceById };
};
