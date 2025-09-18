import { z } from 'zod';

export interface PayloadOptionDefinition {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  validationMessage?: string;
}

export interface PayloadDefinition {
  id: string;
  name: string;
  description: string;
  architectures: string[];
  encoders: string[];
  options: PayloadOptionDefinition[];
}

const ipRegex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

const isIpAddress = (value: string): boolean => ipRegex.test(value.trim());

const isPort = (value: string): boolean => {
  const port = Number(value.trim());
  return Number.isInteger(port) && port >= 1 && port <= 65535;
};

const hasLeadingSlash = (value: string): boolean => value.trim().startsWith('/');

export const payloadDefinitions: PayloadDefinition[] = [
  {
    id: 'windows/meterpreter_reverse_tcp',
    name: 'Windows Meterpreter Reverse TCP',
    description:
      'Classic Meterpreter reverse TCP payload for Windows hosts with staged connection.',
    architectures: ['x86', 'x64'],
    encoders: ['generic/none', 'x86/shikata_ga_nai', 'x64/xor_dynamic'],
    options: [
      {
        name: 'LHOST',
        label: 'LHOST',
        description: 'Local interface to receive the incoming session.',
        placeholder: '192.168.56.1',
        required: true,
        validator: isIpAddress,
        validationMessage: 'Enter a valid IPv4 address.',
      },
      {
        name: 'LPORT',
        label: 'LPORT',
        description: 'Local port for the handler (1-65535).',
        defaultValue: '4444',
        required: true,
        validator: isPort,
        validationMessage: 'Enter a port number between 1 and 65535.',
      },
      {
        name: 'EXITFUNC',
        label: 'EXITFUNC',
        description: 'Method the payload should use to exit.',
        defaultValue: 'thread',
      },
    ],
  },
  {
    id: 'linux/x64/meterpreter_reverse_tcp',
    name: 'Linux Meterpreter Reverse TCP',
    description:
      'Staged reverse TCP meterpreter for Linux with optional SSL negotiation.',
    architectures: ['x64'],
    encoders: ['generic/none', 'x64/xor_dynamic'],
    options: [
      {
        name: 'LHOST',
        label: 'LHOST',
        description: 'Callback interface for the payload.',
        placeholder: '10.10.14.1',
        required: true,
        validator: isIpAddress,
        validationMessage: 'Enter a valid IPv4 address.',
      },
      {
        name: 'LPORT',
        label: 'LPORT',
        description: 'Listener port for the payload connection.',
        defaultValue: '4444',
        required: true,
        validator: isPort,
        validationMessage: 'Enter a port number between 1 and 65535.',
      },
      {
        name: 'SSL',
        label: 'SSL',
        description: 'Enable SSL for transport (true/false).',
        defaultValue: 'false',
      },
    ],
  },
  {
    id: 'python/meterpreter_reverse_https',
    name: 'Python Meterpreter Reverse HTTPS',
    description:
      'Python reverse HTTPS meterpreter payload with URI customisation.',
    architectures: ['python'],
    encoders: ['generic/none'],
    options: [
      {
        name: 'LHOST',
        label: 'LHOST',
        description: 'Callback interface for the payload.',
        placeholder: '10.0.0.5',
        required: true,
        validator: isIpAddress,
        validationMessage: 'Enter a valid IPv4 address.',
      },
      {
        name: 'LPORT',
        label: 'LPORT',
        description: 'Listener port for the payload connection.',
        defaultValue: '8443',
        required: true,
        validator: isPort,
        validationMessage: 'Enter a port number between 1 and 65535.',
      },
      {
        name: 'URIPATH',
        label: 'URI Path',
        description: 'Endpoint path for staging, must start with a slash.',
        defaultValue: '/metasploit',
        validator: hasLeadingSlash,
        validationMessage: 'Provide a relative URI path that begins with /.',
      },
    ],
  },
];

const payloadDefinitionMap = new Map(payloadDefinitions.map((definition) => [definition.id, definition]));

export const getPayloadDefinition = (type: string): PayloadDefinition | undefined =>
  payloadDefinitionMap.get(type);

export const payloadSelectionSchema = z
  .object({
    type: z.string(),
    architecture: z.string(),
    encoder: z.string(),
    options: z.record(z.string(), z.string()).default({}),
  })
  .superRefine((value, ctx) => {
    const definition = payloadDefinitionMap.get(value.type);
    if (!definition) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: 'Select a valid payload type.',
      });
      return;
    }

    if (!definition.architectures.includes(value.architecture)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['architecture'],
        message: 'Architecture is not supported by this payload.',
      });
    }

    if (!definition.encoders.includes(value.encoder)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['encoder'],
        message: 'Encoder is not compatible with this payload.',
      });
    }

    definition.options.forEach((option) => {
      const rawValue = value.options?.[option.name] ?? '';
      const trimmed = rawValue.trim();

      if (option.required && !trimmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options', option.name],
          message: `${option.label} is required.`,
        });
        return;
      }

      if (trimmed && option.validator && !option.validator(trimmed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options', option.name],
          message: option.validationMessage || `${option.label} is invalid.`,
        });
      }
    });
  });

export type PayloadSelection = z.infer<typeof payloadSelectionSchema>;

export const buildPayloadScript = (selection: PayloadSelection): string => {
  const definition = payloadDefinitionMap.get(selection.type);
  const lines = [`use payload/${selection.type}`];
  lines.push(`set ARCH ${selection.architecture}`);
  lines.push(`set ENCODER ${selection.encoder}`);

  if (definition) {
    definition.options.forEach((option) => {
      const value = selection.options?.[option.name]?.trim();
      if (value) {
        lines.push(`set ${option.name} ${value}`);
      } else if (option.defaultValue) {
        lines.push(`set ${option.name} ${option.defaultValue}`);
      }
    });
  } else {
    Object.entries(selection.options || {}).forEach(([key, value]) => {
      if (value?.trim()) {
        lines.push(`set ${key} ${value.trim()}`);
      }
    });
  }

  lines.push('generate -f raw');
  return lines.join('\n');
};
