export type PreviewBlock =
  | { kind: 'text'; content: string }
  | { kind: 'code'; content: string; language?: string }
  | { kind: 'image'; src: string; alt: string; caption?: string };

export interface FilePreviewRecord {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  size: string;
  tags: string[];
  metadata: Record<string, string>;
  blocks: PreviewBlock[];
  downloadUrl?: string;
}

export const filePreviewRecords: FilePreviewRecord[] = [
  {
    id: 'chain-of-custody-log',
    title: 'Chain of Custody Log – WKS-14',
    summary:
      'Immutable audit entries captured during the onsite collection of workstation WKS-14. Each acquisition was hashed twice and sealed before transport to the forensic lab.',
    createdAt: '2025-02-19T17:22:00Z',
    size: '2.7 KB',
    tags: ['forensics', 'audit', 'chain-of-custody'],
    metadata: {
      'Collected by': 'Analyst R. Singh',
      Location: 'Field Site: Portland Lab',
      'Checksum (SHA-256)': '9d7c3a6f2fb1f3c7c8a01b6d115be6f0f5a0ee5c22cda3f249d2a589b942ed3b',
      Sensitivity: 'Confidential',
    },
    blocks: [
      {
        kind: 'text',
        content:
          'Entries are written immediately after the evidence seal is applied. Any modification to the log regenerates the hash value and invalidates the signature, so downstream tooling should treat mismatches as tamper indicators.',
      },
      {
        kind: 'code',
        language: 'text',
        content: `2025-02-19T17:22Z | Capture start | Device=WKS-14-SSD | Hash=9d7c3a6f2fb1...
2025-02-19T17:46Z | Capture sealed | Seal-ID=23-0411A | Courier=F. Morales
2025-02-20T03:12Z | Intake verified | Vault=PF-Locker-07 | Intact=true
2025-02-20T11:08Z | Analysis checkout | Analyst=R. Singh | Purpose=Timeline build
2025-02-20T18:42Z | Return to vault | Chain hash verified | Notes=No anomalies`,
      },
    ],
    downloadUrl: '/demo-data/files/chain-of-custody-log.txt',
  },
  {
    id: 'endpoint-memory-report',
    title: 'Endpoint Memory Survey – Suspicious Processes',
    summary:
      'Triaged processes pulled from a live memory acquisition. Enrichment aggregates prevalence data from the internal threat feed.',
    createdAt: '2025-03-04T09:18:00Z',
    size: '4.1 KB',
    tags: ['incident-response', 'memory', 'analysis'],
    metadata: {
      Hostname: 'ENG-LAP-552',
      'Collection tool': 'Volatility 3 (profile: Win10x64_19044)',
      'Sweep operator': 'Analyst L. Njoroge',
      'SHA-256 archive': '3b1f0aa9745b7b9f5d4d8c6bd8510a4c8f4a6e2013f4f915b87a0fd8a38e9021',
    },
    blocks: [
      {
        kind: 'text',
        content:
          'Only processes lacking a baseline match or signed binary were escalated. Analysts should compare the prevalence score with the internal allow list before triggering containment.',
      },
      {
        kind: 'code',
        language: 'text',
        content: `PID   NAME                SIGNED  PREVALENCE  NOTES
4048  rundll32.exe        false   02/50       Spawned from Teams updater cache
5320  msedge.exe          false   00/50       Injected thread present, see dump
6124  powershell.exe      false   01/50       Encoded command launches cURL beacon
7332  svchost.exe         true    48/50       Hosting PrintWorkflow (expected)
9004  diagtrackrunner.exe false   00/50       File absent on gold image`,
      },
      {
        kind: 'text',
        content:
          'Recommendation: capture a full disk image if the unsigned rundll32 persistence survives reboot. Memory strings point to a sideloaded DLL within the Teams cache directory.',
      },
    ],
    downloadUrl: '/demo-data/files/endpoint-memory-report.txt',
  },
  {
    id: 'phishing-lure-email',
    title: 'Phishing Lure – Invoice Reconciliation Thread',
    summary:
      'Headers and message body extracted from the quarantined phishing attempt impersonating the finance department. Links resolve to a credential-harvesting clone.',
    createdAt: '2025-03-12T14:06:00Z',
    size: '3.4 KB',
    tags: ['phishing', 'email', 'intel'],
    metadata: {
      Sender: '"Accounts Payable" <accounts@contoso-internal.com>',
      Recipient: 'finance-notifications@unnippillil.com',
      'Attachment hash': '5a9bba8bdc1ec0d5577ed2514d1b149e2d61b179355fea6b10d5f88ebbd4bb11',
      Verdict: 'Malicious – credential harvest',
    },
    blocks: [
      {
        kind: 'code',
        language: 'text',
        content: `Received: from gateway02 by mail.unnippillil.com with ESMTPS id 84ad3
DKIM-Signature: v=1; a=rsa-sha256; d=contoso-internal.com; s=mail;
Subject: Re: Q1 invoice reconciliation outstanding
From: "Accounts Payable" <accounts@contoso-internal.com>
To: finance-notifications@unnippillil.com
Date: Tue, 12 Mar 2025 14:05:33 +0000`,
      },
      {
        kind: 'text',
        content:
          'The visible link text matches the finance SharePoint instance while the href resolves to hxxps://invoice-check[.]support. The web kit mirrors the corporate Okta login and sends credentials to an Azure Functions collector.',
      },
      {
        kind: 'code',
        language: 'markdown',
        content: `**Analyst notes**
- Attachment is a HTML smuggling payload with an embedded VBScript downloader.
- Reported by user within 11 minutes – reward eligible.
- Block list entry pushed to secure email gateway at 14:19 UTC.`,
      },
    ],
    downloadUrl: '/demo-data/files/phishing-lure-email.txt',
  },
];

export function getFilePreviewById(id: string): FilePreviewRecord | undefined {
  return filePreviewRecords.find((record) => record.id === id);
}
