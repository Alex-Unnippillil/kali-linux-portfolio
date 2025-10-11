import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvidenceVaultApp from '../components/apps/evidence-vault';
import { persistEvidenceRecords } from '../utils/evidenceVaultStorage';

const idbStore = new Map<string, unknown>();

jest.mock('idb-keyval', () => ({
  get: jest.fn(async (key: string) => idbStore.get(key)),
  set: jest.fn(async (key: string, value: unknown) => {
    idbStore.set(key, value);
  }),
  del: jest.fn(async (key: string) => {
    idbStore.delete(key);
  }),
}));

const demoRecords = [
  {
    id: 'ir-2024-001-memdump',
    title: 'IR-2024-001 Memory Capture',
    summary: 'Memory snapshot triaged for possible credential theft on workstation 07.',
    status: 'Under Review',
    metadata: {
      caseId: 'IR-2024-001',
      source: 'Workstation 07 live response',
      location: 'Toronto SOC lab',
      analyst: 'Priya Desai',
      collectedAt: '2024-02-20T13:42:00Z',
      classification: 'Confidential',
      tags: ['case/IR-2024-001', 'artifact/memory', 'impact/credential-access'],
    },
    attachments: [
      {
        id: 'ir-2024-001-note',
        kind: 'note',
        title: 'Initial triage notes',
        description: 'Highlights suspicious processes from the memory capture.',
        createdAt: '2024-02-20T14:05:00Z',
        tags: ['analysis/triage'],
        body: 'Reviewed Volatility pslist output; rundll32 -> powershell chain observed.',
      },
      {
        id: 'ir-2024-001-triage',
        kind: 'file',
        title: 'Volatility triage summary',
        description: 'Text export of notable findings from volatility workflow.',
        createdAt: '2024-02-20T14:10:00Z',
        tags: ['export/report'],
        fileName: 'memdump-triage.txt',
        mimeType: 'text/plain',
        sizeBytes: 546,
        downloadUrl: '/demo-data/evidence-vault/memdump-triage.txt',
      },
    ],
  },
  {
    id: 'ir-2024-002-exfil',
    title: 'IR-2024-002 Exfiltration Review',
    summary: 'Outbound data movement detected via email and cloud sync utilities.',
    status: 'Containment',
    metadata: {
      caseId: 'IR-2024-002',
      source: 'Email security & proxy logs',
      location: 'Remote workforce segment',
      analyst: 'Jordan Miles',
      collectedAt: '2024-02-19T22:05:00Z',
      classification: 'Restricted',
      tags: ['case/IR-2024-002', 'impact/exfiltration', 'artifact/log'],
    },
    attachments: [
      {
        id: 'ir-2024-002-note',
        kind: 'note',
        title: 'Containment checklist',
        description: 'Steps executed with messaging security during incident triage.',
        createdAt: '2024-02-19T22:15:00Z',
        tags: ['analysis/containment'],
        body: 'Disabled outbound email for account jordan.miles.',
      },
    ],
  },
];

const mockFetch = () =>
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => demoRecords,
  } as unknown as Response);

const queuePrompts = (values: (string | null)[], fallback = '') => {
  const promptSpy = jest.spyOn(window, 'prompt');
  promptSpy.mockImplementation(() => fallback);
  values.forEach((value) => {
    promptSpy.mockImplementationOnce(() => value as string | null);
  });
  return promptSpy;
};

const defaultRecordInputs = {
  title: 'Test incident record',
  summary: 'Summary for automated test record.',
  status: 'Draft',
  classification: 'Confidential',
  caseId: 'IR-TEST-001',
  source: 'Automated harness',
  location: 'Unit test lab',
  analyst: 'Test Analyst',
  collectedAt: '2024-03-01T12:00:00Z',
  tags: 'case/IR-TEST-001,artifact/log',
};

const createRecordForTest = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<typeof defaultRecordInputs> = {}
) => {
  const inputs = { ...defaultRecordInputs, ...overrides };
  queuePrompts([
    inputs.title,
    inputs.summary,
    inputs.status,
    inputs.classification,
    inputs.caseId,
    inputs.source,
    inputs.location,
    inputs.analyst,
    inputs.collectedAt,
    inputs.tags,
  ]);
  await user.click(await screen.findByRole('button', { name: /new record/i }));
  await screen.findByRole('heading', { level: 1, name: inputs.title });
  return inputs;
};

const findRecordLabel = async (title: string) => {
  const list = await screen.findByTestId('record-list');
  return within(list).findByText(title, { selector: 'p' });
};

const findRecordButton = async (title: string) => {
  const label = await findRecordLabel(title);
  const button = label.closest('button');
  if (!button) {
    throw new Error(`Unable to locate button for record: ${title}`);
  }
  return button as HTMLButtonElement;
};

const findTagButton = async (label: string) => {
  const tree = await screen.findByTestId('tag-tree');
  const tagLabel = await within(tree).findByText(label, { selector: 'span' });
  const button = tagLabel.closest('button');
  if (!button) {
    throw new Error(`Unable to locate tag button for: ${label}`);
  }
  return button as HTMLButtonElement;
};

beforeEach(async () => {
  idbStore.clear();
  await persistEvidenceRecords([]);
});

afterEach(async () => {
  jest.restoreAllMocks();
  idbStore.clear();
  await persistEvidenceRecords([]);
});

it('renders demo records with metadata and attachments', async () => {
  mockFetch();
  const user = userEvent.setup();
  render(<EvidenceVaultApp />);
  await user.click(await findRecordButton('IR-2024-001 Memory Capture'));
  const detail = await screen.findByTestId('record-detail');
  expect(within(detail).getByText(/Memory snapshot triaged/)).toBeInTheDocument();
  expect(await within(detail).findByText('Initial triage notes')).toBeInTheDocument();
  expect(within(detail).getByText('memdump-triage.txt')).toBeInTheDocument();
});

it('creates a new evidence record through prompts', async () => {
  mockFetch();
  const user = userEvent.setup();
  render(<EvidenceVaultApp />);
  await findRecordLabel('IR-2024-001 Memory Capture');

  const prompts = [
    'Workstation disk snapshot',
    'Disk artifact summary',
    'Draft',
    'Restricted',
    'IR-2024-003',
    'Acquisition toolkit',
    'Digital forensics lab',
    'Morgan Lee',
    '2024-03-01T10:12:00Z',
    'case/IR-2024-003,artifact/disk',
  ];
  queuePrompts(prompts);

  await user.click(await screen.findByRole('button', { name: /new record/i }));
  const detail = await screen.findByTestId('record-detail');
  expect(
    within(detail).getByRole('heading', { level: 1, name: 'Workstation disk snapshot' })
  ).toBeInTheDocument();
  expect(within(detail).getByText('Disk artifact summary')).toBeInTheDocument();
  expect(
    within(detail).getByTestId('metadata-list').textContent
  ).toContain('IR-2024-003');
});

it('updates metadata for the selected record', async () => {
  mockFetch();
  const user = userEvent.setup();
  render(<EvidenceVaultApp />);
  await findRecordLabel('IR-2024-001 Memory Capture');

  const newRecord = await createRecordForTest(user, {
    title: 'Record to update',
    caseId: 'IR-UPDATE-001',
  });

  await user.click(await findRecordButton(newRecord.title));
  await screen.findByRole('heading', { level: 1, name: newRecord.title });

  const prompts = [
    'Record to update',
    'Updated memory summary',
    'Under Review',
    'Confidential',
    'IR-UPDATE-001',
    'Updated source system',
    'Updated location',
    'Updated Analyst',
    '2024-03-02T15:30:00Z',
    'case/IR-UPDATE-001,artifact/memory,impact/credential-access',
  ];
  queuePrompts(prompts);

  await user.click(await screen.findByRole('button', { name: /edit details/i }));
  const detail = await screen.findByTestId('record-detail');
  expect(await within(detail).findByText('Updated memory summary')).toBeInTheDocument();
});

it('deletes a record after confirmation', async () => {
  mockFetch();
  const user = userEvent.setup();
  render(<EvidenceVaultApp />);
  await findRecordLabel('IR-2024-001 Memory Capture');

  const newRecord = await createRecordForTest(user, {
    title: 'Record to delete',
    caseId: 'IR-DELETE-001',
  });

  await user.click(await findRecordButton(newRecord.title));
  await screen.findByRole('heading', { level: 1, name: newRecord.title });

  jest.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(await screen.findByTestId('delete-record'));
  await waitFor(() => {
    const list = screen.getByTestId('record-list');
    expect(
      within(list).queryByText(newRecord.title, { selector: 'p' })
    ).not.toBeInTheDocument();
  });
});

it('adds note and file attachments to a record', async () => {
  mockFetch();
  const user = userEvent.setup();
  render(<EvidenceVaultApp />);
  await findRecordLabel('IR-2024-001 Memory Capture');

  const newRecord = await createRecordForTest(user, {
    title: 'Record with attachments',
    caseId: 'IR-ATTACH-001',
  });

  await user.click(await findRecordButton(newRecord.title));
  const detail = await screen.findByTestId('record-detail');

  queuePrompts([
    'Containment action plan',
    'Isolate host and capture memory.',
    'Escalation checklist',
    'analysis/triage',
  ]);
  await user.click(await screen.findByTestId('add-note'));
  expect(
    await within(detail).findByText('Containment action plan')
  ).toBeInTheDocument();
  expect(
    within(detail).getByText('Isolate host and capture memory.')
  ).toBeInTheDocument();

  queuePrompts([
    'Proxy export',
    'Outbound traffic log',
    'artifact/log',
  ]);
  await user.click(await screen.findByTestId('add-file'));

  const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
  const payload = new Uint8Array([101, 118, 101, 110, 116, 44, 100, 101, 116, 97, 105, 108]);
  const file = {
    name: 'proxy.csv',
    type: 'text/csv',
    size: payload.byteLength,
    arrayBuffer: async () =>
      payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
  } as unknown as File;
  const originalFileReader = (window as any).FileReader;
  (window as any).FileReader = undefined;
  try {
    fireEvent.change(fileInput, { target: { files: [file] } });
  } finally {
    (window as any).FileReader = originalFileReader;
  }

  await waitFor(() => expect(within(detail).getByText('Proxy export')).toBeInTheDocument());
  const attachments = within(screen.getByTestId('attachments-list'));
  const fileEntry = attachments.getByText('Proxy export').closest('li');
  expect(fileEntry).not.toBeNull();
  const fileScope = within(fileEntry as HTMLElement);
  expect(fileScope.getByText('proxy.csv')).toBeInTheDocument();
  expect(fileScope.getByRole('link', { name: /download attachment/i })).toBeInTheDocument();
});

it('filters records by tag selections and exposes the untagged bucket', async () => {
  mockFetch();
  const user = userEvent.setup();
  render(<EvidenceVaultApp />);
  await findRecordLabel('IR-2024-001 Memory Capture');

  await createRecordForTest(user, {
    title: 'Untagged record',
    summary: 'Record without tag metadata.',
    tags: '',
  });

  await findTagButton('(untagged)');

  await user.click(await findTagButton('log'));
  const list = await screen.findByTestId('record-list');
  await waitFor(() => {
    expect(within(list).getAllByRole('button')).toHaveLength(1);
  });
  expect(
    within(list).getByText('IR-2024-002 Exfiltration Review')
  ).toBeInTheDocument();

  await user.click(await findTagButton('(untagged)'));
  await waitFor(() => {
    expect(within(list).getAllByRole('button')).toHaveLength(1);
  });
  expect(
    within(list).getByText('Untagged record', { selector: 'p' })
  ).toBeInTheDocument();
});

it('reloads the demo dataset and discards local-only records', async () => {
  const fetchSpy = mockFetch();
  const user = userEvent.setup();
  render(<EvidenceVaultApp />);
  await findRecordLabel('IR-2024-001 Memory Capture');

  await createRecordForTest(user, {
    title: 'Temporary record',
    caseId: 'IR-TEMP-001',
    tags: 'case/IR-TEMP-001',
  });

  const list = await screen.findByTestId('record-list');
  expect(
    await within(list).findByText('Temporary record', { selector: 'p' })
  ).toBeInTheDocument();

  await user.click(await screen.findByRole('button', { name: /reload demo dataset/i }));
  await waitFor(() => {
    expect(
      within(list).queryByText('Temporary record', { selector: 'p' })
    ).not.toBeInTheDocument();
  });
  expect(
    await within(list).findByText('IR-2024-001 Memory Capture')
  ).toBeInTheDocument();
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});
