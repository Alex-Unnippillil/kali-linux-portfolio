export interface HexRow {
  address: string;
  bytes: string[];
  ascii: string;
  description?: string;
}

export interface DisassemblyLine {
  address: string;
  label?: string;
  mnemonic: string;
  operands?: string;
  comment?: string;
  bytes?: string;
  xrefs?: { type: 'call' | 'jump' | 'fallthrough'; target: string; description?: string }[];
  notes?: string;
}

export interface GraphNode {
  id: string;
  address: string;
  label: string;
  summary: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'call' | 'conditional' | 'fallthrough';
  description?: string;
}

export interface Finding {
  id: string;
  address: string;
  title: string;
  severity: 'info' | 'medium' | 'high';
  detail: string;
}

export interface TutorialStep {
  title: string;
  body: string;
}

export interface Radare2Dataset {
  id: string;
  name: string;
  fileName: string;
  architecture: string;
  format: string;
  compiler: string;
  description: string;
  entry: string;
  security: string[];
  hexdump: HexRow[];
  disassembly: DisassemblyLine[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  findings: Finding[];
  tutorial: TutorialStep[];
  defaultFocus: string;
  references: { [address: string]: string };
  release: string;
}

export const radare2Datasets: Radare2Dataset[] = [
  {
    id: 'demo-login',
    name: 'Login Routine',
    fileName: 'auth_check.bin',
    architecture: 'amd64',
    format: 'ELF 64-bit',
    compiler: 'Clang 14.0 (O1)',
    description:
      'Static analysis capture of a login verification routine with a simple branch-driven control flow.',
    entry: '0x00400540',
    security: ['NX enabled', 'No stack canary', 'Partial RELRO'],
    release: 'Lab archive 2024.03',
    hexdump: [
      {
        address: '0x00400540',
        bytes: ['55', '48', '89', 'e5', '48', '83', 'ec', '20'],
        ascii: '..H..H.. ',
        description: 'Function prologue, reserve local stack',
      },
      {
        address: '0x00400548',
        bytes: ['48', '8b', '45', '08', '48', '89', '45', 'f0'],
        ascii: 'H.E.H.E.',
        description: 'Load username pointer and stash on stack',
      },
      {
        address: '0x00400550',
        bytes: ['48', '8b', '45', '10', '48', '89', '45', 'f8'],
        ascii: 'H.E.H.E.',
        description: 'Load password pointer and stash on stack',
      },
      {
        address: '0x00400558',
        bytes: ['e8', 'a3', '00', '00', '00', '85', 'c0', '75'],
        ascii: '......u',
        description: 'Call checker and test result',
      },
      {
        address: '0x00400560',
        bytes: ['0a', 'b8', '01', '00', '00', '00', 'eb', '0c'],
        ascii: '........',
        description: 'Set success flag, skip failure handler',
      },
      {
        address: '0x00400568',
        bytes: ['b8', '00', '00', '00', '00', 'eb', '06', '48'],
        ascii: '......H',
        description: 'Failure path returns zero',
      },
      {
        address: '0x00400570',
        bytes: ['83', 'c4', '20', '5d', 'c3', 'e8', '31', '00'],
        ascii: '.. ]..1.',
        description: 'Epilogue and tail-call to logger',
      },
      {
        address: '0x00400578',
        bytes: ['00', '00', '00', '00', '90', '90', '90', '90'],
        ascii: '........',
        description: 'Padding NOP sled used by logger thunk',
      },
    ],
    disassembly: [
      {
        address: '0x00400540',
        label: 'sym.login_verify',
        mnemonic: 'push',
        operands: 'rbp',
        comment: 'Preserve old base pointer',
      },
      {
        address: '0x00400541',
        mnemonic: 'mov',
        operands: 'rbp, rsp',
        comment: 'Establish new frame',
      },
      {
        address: '0x00400544',
        mnemonic: 'sub',
        operands: 'rsp, 0x20',
        comment: 'Allocate local stack space',
      },
      {
        address: '0x00400548',
        mnemonic: 'mov',
        operands: 'rax, qword [rbp + 0x8]',
        comment: 'Load username pointer',
      },
      {
        address: '0x0040054c',
        mnemonic: 'mov',
        operands: 'qword [rbp - 0x10], rax',
        comment: 'Store username locally',
      },
      {
        address: '0x00400550',
        mnemonic: 'mov',
        operands: 'rax, qword [rbp + 0x10]',
        comment: 'Load password pointer',
      },
      {
        address: '0x00400554',
        mnemonic: 'mov',
        operands: 'qword [rbp - 0x8], rax',
        comment: 'Store password locally',
      },
      {
        address: '0x00400558',
        mnemonic: 'call',
        operands: 'sym.check_password',
        comment: 'Invoke credential verifier',
        xrefs: [
          {
            type: 'call',
            target: '0x00400600',
            description: 'Branch to password checker',
          },
        ],
      },
      {
        address: '0x0040055d',
        mnemonic: 'test',
        operands: 'eax, eax',
        comment: 'Set flags based on checker result',
      },
      {
        address: '0x0040055f',
        mnemonic: 'jne',
        operands: '0x00400568',
        comment: 'Failed check jumps to cleanup',
        xrefs: [
          {
            type: 'jump',
            target: '0x00400568',
            description: 'Error path',
          },
        ],
      },
      {
        address: '0x00400561',
        mnemonic: 'mov',
        operands: 'eax, 1',
        comment: 'Prepare success return value',
      },
      {
        address: '0x00400566',
        mnemonic: 'jmp',
        operands: '0x00400570',
        comment: 'Skip failure block',
        xrefs: [
          {
            type: 'jump',
            target: '0x00400570',
            description: 'Shared epilogue',
          },
        ],
      },
      {
        address: '0x00400568',
        label: 'loc.failure',
        mnemonic: 'mov',
        operands: 'eax, 0',
        comment: 'Failure return value',
      },
      {
        address: '0x0040056d',
        mnemonic: 'jmp',
        operands: '0x00400570',
        comment: 'Join epilogue',
        xrefs: [
          {
            type: 'jump',
            target: '0x00400570',
            description: 'Fallthrough to epilogue',
          },
        ],
      },
      {
        address: '0x00400570',
        label: 'loc.exit',
        mnemonic: 'leave',
        comment: 'Restore stack frame',
      },
      {
        address: '0x00400571',
        mnemonic: 'ret',
        comment: 'Return to caller',
      },
      {
        address: '0x00400572',
        mnemonic: 'call',
        operands: 'sym.audit_logger',
        comment: 'Deferred logging call',
        xrefs: [
          {
            type: 'call',
            target: '0x00400630',
            description: 'Inform audit log',
          },
        ],
      },
    ],
    graph: {
      nodes: [
        {
          id: 'node-entry',
          address: '0x00400540',
          label: 'sym.login_verify',
          summary: 'Entry point sets up frame and parameters.',
          x: 60,
          y: 90,
        },
        {
          id: 'node-check',
          address: '0x00400558',
          label: 'sym.check_password',
          summary: 'External verification routine.',
          x: 220,
          y: 40,
        },
        {
          id: 'node-branch',
          address: '0x00400568',
          label: 'loc.failure',
          summary: 'Failure path zeroes eax.',
          x: 220,
          y: 140,
        },
        {
          id: 'node-exit',
          address: '0x00400570',
          label: 'loc.exit',
          summary: 'Common epilogue with optional logging.',
          x: 360,
          y: 90,
        },
      ],
      edges: [
        {
          from: 'node-entry',
          to: 'node-check',
          type: 'call',
          description: 'Check credentials',
        },
        {
          from: 'node-entry',
          to: 'node-branch',
          type: 'conditional',
          description: 'jne failure',
        },
        {
          from: 'node-branch',
          to: 'node-exit',
          type: 'fallthrough',
          description: 'jmp exit',
        },
        {
          from: 'node-check',
          to: 'node-exit',
          type: 'fallthrough',
          description: 'Success path',
        },
      ],
    },
    findings: [
      {
        id: 'finding-canary',
        address: '0x00400540',
        title: 'Stack canary missing',
        severity: 'medium',
        detail:
          'Compilation lacks stack protector which would mitigate stack smashing.',
      },
      {
        id: 'finding-logging',
        address: '0x00400572',
        title: 'Deferred audit logging',
        severity: 'info',
        detail:
          'Logger executes after return, meaning failures are logged even on success.',
      },
    ],
    tutorial: [
      {
        title: 'Welcome to the Radare2 Lab',
        body:
          'This guided tour uses an offline capture of radare2 output so you can explore analysis techniques safely.',
      },
      {
        title: 'Inspect the Hexdump',
        body:
          'Start on the Hex view to align opcode bytes with addresses. Hover or focus rows to see contextual hints.',
      },
      {
        title: 'Follow the Disassembly',
        body:
          'Switch to the disassembly tab and click an instruction to sync highlights across the dataset.',
      },
      {
        title: 'Enable Lab Mode',
        body:
          'Activate Lab Mode to interact with cross-references and the control-flow graph. This keeps demos read-only by default.',
      },
    ],
    defaultFocus: '0x00400558',
    references: {
      '0x00400558': 'Primary credential verification call into sym.check_password',
      '0x0040055f': 'Conditional jump splits success and failure',
      '0x00400572': 'Lazy logger invoked regardless of branch outcome',
    },
  },
  {
    id: 'firmware-update',
    name: 'Firmware Update State Machine',
    fileName: 'fw_update.bin',
    architecture: 'armv7',
    format: 'ELF 32-bit',
    compiler: 'GCC 11.2 (Os)',
    description:
      'Reverse engineered state machine for an embedded firmware updater, showcasing indirect jumps and graph fan-out.',
    entry: '0x00010510',
    security: ['NX enabled', 'RELRO full', 'Fortify source hints'],
    release: 'Lab archive 2023.12',
    hexdump: [
      {
        address: '0x00010510',
        bytes: ['b5', 'f0', '2d', 'e9', '00', '40', '2d', 'e9'],
        ascii: '...-.@-.',
        description: 'Push registers, allocate frame',
      },
      {
        address: '0x00010518',
        bytes: ['04', '30', '8d', 'e2', '10', '00', '9f', 'e5'],
        ascii: '.....',
        description: 'Load configuration pointer',
      },
      {
        address: '0x00010520',
        bytes: ['10', '10', '9f', 'e5', '00', '00', '8f', 'e0'],
        ascii: '........',
        description: 'Indirect jump table fetch',
      },
      {
        address: '0x00010528',
        bytes: ['00', '00', '5f', 'e3', '04', '00', '00', '0a'],
        ascii: '..._....',
        description: 'Compare state and branch if >= 4',
      },
      {
        address: '0x00010530',
        bytes: ['04', '00', '00', '0a', '10', '10', '9f', 'e5'],
        ascii: '........',
        description: 'Jump table dispatch',
      },
      {
        address: '0x00010538',
        bytes: ['08', '00', '00', 'ea', '01', '00', 'a0', 'e3'],
        ascii: '........',
        description: 'Set return value to success',
      },
      {
        address: '0x00010540',
        bytes: ['04', '30', '8d', 'e5', 'bd', 'f0', '9d', 'e8'],
        ascii: '... .....',
        description: 'Store result and pop registers',
      },
    ],
    disassembly: [
      {
        address: '0x00010510',
        label: 'sym.update_dispatch',
        mnemonic: 'push',
        operands: '{r4, r5, r6, lr}',
        comment: 'Save callee registers',
      },
      {
        address: '0x00010514',
        mnemonic: 'sub',
        operands: 'sp, sp, #0x40',
        comment: 'Stack frame allocation',
      },
      {
        address: '0x00010518',
        mnemonic: 'add',
        operands: 'r3, pc, #0x4',
        comment: 'Load table base',
      },
      {
        address: '0x0001051c',
        mnemonic: 'ldr',
        operands: 'r0, [pc, #0x10]',
        comment: 'Load state index',
      },
      {
        address: '0x00010520',
        mnemonic: 'ldr',
        operands: 'pc, [r3, r0, lsl #2]',
        comment: 'Jump through table',
        xrefs: [
          {
            type: 'jump',
            target: '0x00010560',
            description: 'Dispatch to handler',
          },
        ],
      },
      {
        address: '0x00010524',
        mnemonic: 'cmp',
        operands: 'r0, #4',
        comment: 'Ensure state is in range',
      },
      {
        address: '0x00010528',
        mnemonic: 'bhs',
        operands: '0x0001053c',
        comment: 'Branch to fail-safe',
        xrefs: [
          {
            type: 'jump',
            target: '0x0001053c',
            description: 'High-or-same branch to fallback',
          },
        ],
      },
      {
        address: '0x00010530',
        mnemonic: 'add',
        operands: 'r3, pc, #0x10',
        comment: 'Compute jump table base',
      },
      {
        address: '0x00010534',
        mnemonic: 'ldr',
        operands: 'pc, [r3, r0, lsl #2]',
        comment: 'Indexed branch to state handler',
        xrefs: [
          {
            type: 'jump',
            target: '0x00010580',
            description: 'State-specific handler',
          },
        ],
      },
      {
        address: '0x00010538',
        mnemonic: 'b',
        operands: '0x00010548',
        comment: 'Skip fail-safe after dispatch',
      },
      {
        address: '0x0001053c',
        label: 'loc.fail_safe',
        mnemonic: 'mov',
        operands: 'r0, #0',
        comment: 'Fail-safe return value',
      },
      {
        address: '0x00010540',
        mnemonic: 'str',
        operands: 'r0, [sp, #0x30]',
        comment: 'Persist result in frame',
      },
      {
        address: '0x00010544',
        mnemonic: 'pop',
        operands: '{r4, r5, r6, pc}',
        comment: 'Return to caller',
      },
    ],
    graph: {
      nodes: [
        {
          id: 'fw-entry',
          address: '0x00010510',
          label: 'sym.update_dispatch',
          summary: 'Entry to state dispatch routine.',
          x: 60,
          y: 80,
        },
        {
          id: 'fw-table',
          address: '0x00010520',
          label: 'Jump Table',
          summary: 'Indirect branch to handler based on state.',
          x: 220,
          y: 40,
        },
        {
          id: 'fw-fail',
          address: '0x0001053c',
          label: 'loc.fail_safe',
          summary: 'Fallback when state out of bounds.',
          x: 220,
          y: 140,
        },
        {
          id: 'fw-exit',
          address: '0x00010544',
          label: 'return',
          summary: 'Restore registers and exit.',
          x: 360,
          y: 80,
        },
      ],
      edges: [
        {
          from: 'fw-entry',
          to: 'fw-table',
          type: 'conditional',
          description: 'Dispatch via table',
        },
        {
          from: 'fw-entry',
          to: 'fw-fail',
          type: 'conditional',
          description: 'bhs fail-safe',
        },
        {
          from: 'fw-table',
          to: 'fw-exit',
          type: 'fallthrough',
          description: 'Handlers rejoin',
        },
        {
          from: 'fw-fail',
          to: 'fw-exit',
          type: 'fallthrough',
          description: 'Fail-safe return',
        },
      ],
    },
    findings: [
      {
        id: 'finding-range-check',
        address: '0x00010528',
        title: 'Jump table range check is minimal',
        severity: 'info',
        detail:
          'Branch ensures bounds but lacks logging for out-of-range states; consider telemetry.',
      },
      {
        id: 'finding-failsafe',
        address: '0x0001053c',
        title: 'Fail-safe returns zero without alert',
        severity: 'medium',
        detail:
          'Returning success may hide update errors. Document the behavior or adjust handler.',
      },
    ],
    tutorial: [
      {
        title: 'Explore the State Machine',
        body: 'Use the canned firmware dataset to study an indirect jump pattern.',
      },
      {
        title: 'Watch the Jump Table',
        body: 'Graph nodes illustrate how dispatch fans out to handlers.',
      },
      {
        title: 'Review Findings',
        body: 'Metadata panels summarize risks discovered during the offline capture.',
      },
    ],
    defaultFocus: '0x00010520',
    references: {
      '0x00010520': 'Jump-table dispatch entry reading [r3, r0, lsl #2] for handler addresses.',
      '0x00010528': 'Branch-high-or-same chooses fail-safe when state >= 4.',
      '0x0001053c': 'Fail-safe block writes zero return value without logging.',
    },
  },
];

