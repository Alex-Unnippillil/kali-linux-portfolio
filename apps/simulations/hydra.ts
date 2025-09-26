export interface HydraSimulationOptions {
  target: string;
  service: string;
  userList: string;
  passList: string;
  resume?: boolean;
}

export interface HydraSimulationResult {
  output: string;
  attempts: number;
  highlight?: {
    user: string;
    password: string;
    reason: string;
  };
}

export interface HydraStoryboardStep {
  title: string;
  command: string;
  description: string;
  takeaway: string;
}

export const hydraStoryboard: HydraStoryboardStep[] = [
  {
    title: 'Scenario briefing',
    command: 'hydra -L analysts.txt -P seasons.txt ssh://lab-gateway',
    description:
      'Introduce the simulated engagement and stress-test a short user/password list to demonstrate how fast a spray can begin.',
    takeaway:
      'Explain scope and throttle plans to stakeholders before touching credentials.',
  },
  {
    title: 'Controlled spray',
    command: 'hydra -L vpn-users.txt -P top20.txt -t 4 ssh://192.0.2.50',
    description:
      'Highlight the importance of parallelism limits. In the canned output the fourth thread triggers a warning about rate limits.',
    takeaway:
      'Balance speed against account lockouts in a lab rather than on production hosts.',
  },
  {
    title: 'Result review',
    command: 'hydra -l a.turner -P shortlist.txt ftp://files.lab --resume',
    description:
      'Walk through the resume flag to show how a campaign can pick up after a break without reusing attempts.',
    takeaway:
      'Document any credentials surfaced by the simulation and immediately rotate them.',
  },
];

export const hydraSampleScripts = [
  {
    name: 'SSH quick check',
    command: 'hydra -L demo-users.txt -P small.txt ssh://192.0.2.10',
    note: 'Targets a lab SSH endpoint with 16 attempts before simulated lockout.',
  },
  {
    name: 'Web form POST',
    command:
      "hydra -L demo-users.txt -P passwords.txt -s 443 https-post-form \"/login:username=^USER^&password=^PASS^:F=invalid\" example.com",
    note: 'Illustrates form-based attacks without sending live traffic.',
  },
];

const COMMON_PATTERNS = [/spring/i, /summer/i, /2024/, /password/i, /welcome/i];

const summarizeList = (values: string[], max = 3) => {
  const preview = values.slice(0, max).join(', ');
  const overflow = values.length > max ? ` … +${values.length - max} more` : '';
  return values.length ? `${preview}${overflow}` : 'None provided';
};

export const runHydraSimulation = async (
  options: HydraSimulationOptions
): Promise<HydraSimulationResult> => {
  const users = options.userList
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const passwords = options.passList
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const totalAttempts = users.length * passwords.length;
  let highlight: HydraSimulationResult['highlight'];

  for (const user of users) {
    const match = passwords.find((password) =>
      COMMON_PATTERNS.some((regex) => regex.test(password))
    );
    if (match) {
      highlight = {
        user,
        password: match,
        reason: 'Password matches a weak seasonal or common pattern.',
      };
      break;
    }
  }

  const statusLines = [
    'Hydra Simulation Report',
    '=======================',
    `Target: ${options.target || 'N/A'}`,
    `Service: ${options.service || 'ssh'}`,
    `Mode: ${options.resume ? 'Resumed session' : 'Fresh run'}`,
    `User candidates: ${users.length} (${summarizeList(users)})`,
    `Password candidates: ${passwords.length} (${summarizeList(passwords)})`,
    `Total attempts (simulated): ${totalAttempts || 'n/a'}`,
    '',
    'No live network traffic is generated. Use this walkthrough to explain lockout and throttling strategies to clients.',
  ];

  if (highlight) {
    statusLines.push(
      '',
      'Highlighted finding:',
      `- ${highlight.user}:${highlight.password} — ${highlight.reason}`,
      'Discuss credential hygiene with the stakeholder and plan a reset.',
    );
  } else {
    statusLines.push(
      '',
      'No weak credentials were detected in the provided lists. Consider demonstrating password complexity by comparing against corporate policy examples.',
    );
  }

  statusLines.push(
    '',
    'Storyboard reminder:',
    ...hydraStoryboard.map(
      (step, index) => `${index + 1}. ${step.title} → ${step.command}`
    ),
    '',
    'End of simulation.',
  );

  return {
    output: statusLines.join('\n'),
    attempts: totalAttempts,
    highlight,
  };
};

export type HydraControlAction = 'pause' | 'resume' | 'cancel';

export const controlHydraSimulation = async (
  action: HydraControlAction
): Promise<{ status: string }> => {
  switch (action) {
    case 'pause':
      return { status: 'Simulation paused locally.' };
    case 'resume':
      return { status: 'Simulation resumed locally.' };
    case 'cancel':
      return { status: 'Simulation cancelled and state cleared.' };
    default:
      return { status: 'No action performed.' };
  }
};

export default {
  runHydraSimulation,
  controlHydraSimulation,
  hydraStoryboard,
  hydraSampleScripts,
};
