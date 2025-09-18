import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import defaultRuleSet from '../../../filters/colorRules.json';
import { colorDefinitions } from './colorDefs';

export interface ColorRule {
  expression: string;
  color: string;
}

export interface PaletteColor {
  text: string;
  background: string;
  hover: string;
}

export interface RuleEvaluationPacket {
  protocol: number;
  src: string;
  dest: string;
  info?: string;
  sport?: number;
  dport?: number;
  plaintext?: string;
  decrypted?: string;
}

interface CompiledRule {
  rule: ColorRule;
  predicate: (packet: RuleEvaluationPacket) => boolean;
}

interface ColoringContextValue {
  rules: ColorRule[];
  setRules: (rules: ColorRule[]) => void;
  importRules: (rules: unknown) => ColorRule[];
  exportRules: () => string;
  getRuleForPacket: (packet: RuleEvaluationPacket) => ColorRule | undefined;
  palette: Record<string, PaletteColor>;
  isProvided: boolean;
}

const slugifyColor = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, '-');

type ColorDefinition = {
  name: string;
  className: string;
  text?: string;
  background?: string;
  hover?: string;
};

const buildPalette = () => {
  const palette: Record<string, PaletteColor> = {};
  (colorDefinitions as ColorDefinition[]).forEach((definition) => {
    const slug = slugifyColor(definition.name);
    palette[slug] = {
      text: definition.text ?? '#f9fafb',
      background: definition.background ?? '#1f2937',
      hover: definition.hover ?? definition.background ?? '#374151',
    };
  });
  return palette;
};

const filterCache = new Map<string, (packet: RuleEvaluationPacket) => boolean>();

export const sanitizeRuleSet = (input: unknown): ColorRule[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const expression =
        typeof record.expression === 'string'
          ? record.expression.trim()
          : '';
      const color =
        typeof record.color === 'string' ? record.color.trim() : '';
      return { expression, color };
    })
    .filter((rule): rule is ColorRule => rule !== null);
};

const defaultRules = sanitizeRuleSet(defaultRuleSet);
const defaultPalette = buildPalette();
const storageKey = 'wireshark:color-rules';

const compileFilter = (expression: string) => {
  const normalized = expression.trim().toLowerCase();
  if (!normalized) {
    return () => true;
  }
  const cached = filterCache.get(normalized);
  if (cached) return cached;

  let predicate: (packet: RuleEvaluationPacket) => boolean;
  if (normalized === 'tcp') {
    predicate = (packet) => packet.protocol === 6;
  } else if (normalized === 'udp') {
    predicate = (packet) => packet.protocol === 17;
  } else if (normalized === 'icmp') {
    predicate = (packet) => packet.protocol === 1;
  } else {
    let match = normalized.match(/^ip\.addr\s*==\s*(\d+\.\d+\.\d+\.\d+)$/);
    if (match) {
      const ip = match[1];
      predicate = (packet) => packet.src === ip || packet.dest === ip;
    } else if ((match = normalized.match(/^tcp\.port\s*==\s*(\d+)$/))) {
      const port = parseInt(match[1], 10);
      predicate = (packet) =>
        packet.protocol === 6 &&
        (packet.sport === port || packet.dport === port);
    } else if ((match = normalized.match(/^udp\.port\s*==\s*(\d+)$/))) {
      const port = parseInt(match[1], 10);
      predicate = (packet) =>
        packet.protocol === 17 &&
        (packet.sport === port || packet.dport === port);
    } else {
      predicate = (packet) => {
        const term = normalized;
        const info = (packet.info || '').toLowerCase();
        const src = (packet.src || '').toLowerCase();
        const dest = (packet.dest || '').toLowerCase();
        const plaintext =
          (packet.plaintext || packet.decrypted || '').toLowerCase();
        const sport = packet.sport?.toString() ?? '';
        const dport = packet.dport?.toString() ?? '';
        const proto =
          typeof packet.protocol === 'number'
            ? packet.protocol.toString()
            : `${packet.protocol ?? ''}`;
        return (
          src.includes(term) ||
          dest.includes(term) ||
          info.includes(term) ||
          plaintext.includes(term) ||
          sport.includes(term) ||
          dport.includes(term) ||
          proto.toLowerCase().includes(term)
        );
      };
    }
  }

  filterCache.set(normalized, predicate);
  return predicate;
};

const compileRules = (rules: ColorRule[]): CompiledRule[] =>
  rules
    .filter((rule) => rule.expression.trim())
    .map((rule) => ({ rule, predicate: compileFilter(rule.expression) }));

const defaultContextValue: ColoringContextValue = {
  rules: defaultRules,
  setRules: () => {},
  importRules: () => defaultRules,
  exportRules: () => JSON.stringify(defaultRules, null, 2),
  getRuleForPacket: () => undefined,
  palette: defaultPalette,
  isProvided: false,
};

const ColoringContext = createContext<ColoringContextValue>(defaultContextValue);

interface ColoringProviderProps {
  children: ReactNode;
  initialRules?: ColorRule[];
}

export const ColoringProvider: React.FC<ColoringProviderProps> = ({
  children,
  initialRules,
}) => {
  const [rules, setRulesState] = useState<ColorRule[]>(() =>
    initialRules ? sanitizeRuleSet(initialRules) : defaultRules
  );
  const palette = defaultPalette;
  const shouldLoadFromStorage = initialRules === undefined;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const entries = Object.entries(palette);
    entries.forEach(([slug, token]) => {
      root.style.setProperty(`--wireshark-color-${slug}-text`, token.text);
      root.style.setProperty(`--wireshark-color-${slug}-bg`, token.background);
      root.style.setProperty(
        `--wireshark-color-${slug}-hover`,
        token.hover ?? token.background
      );
    });
    return () => {
      entries.forEach(([slug]) => {
        root.style.removeProperty(`--wireshark-color-${slug}-text`);
        root.style.removeProperty(`--wireshark-color-${slug}-bg`);
        root.style.removeProperty(`--wireshark-color-${slug}-hover`);
      });
    };
  }, [palette]);

  useEffect(() => {
    if (!shouldLoadFromStorage || typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const sanitized = sanitizeRuleSet(parsed);
      setRulesState(sanitized);
    } catch {
      // ignore malformed storage
    }
  }, [shouldLoadFromStorage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(rules));
    } catch {
      // ignore storage quota issues
    }
  }, [rules]);

  const compiledRules = useMemo(() => compileRules(rules), [rules]);

  const setRules = useCallback((next: ColorRule[]) => {
    setRulesState(sanitizeRuleSet(next));
  }, []);

  const importRules = useCallback((input: unknown) => {
    const sanitized = sanitizeRuleSet(input);
    setRulesState(sanitized);
    return sanitized;
  }, []);

  const exportRules = useCallback(
    () => JSON.stringify(rules, null, 2),
    [rules]
  );

  const getRuleForPacket = useCallback(
    (packet: RuleEvaluationPacket) => {
      for (const { rule, predicate } of compiledRules) {
        if (predicate(packet)) {
          return rule;
        }
      }
      return undefined;
    },
    [compiledRules]
  );

  const value = useMemo<ColoringContextValue>(
    () => ({
      rules,
      setRules,
      importRules,
      exportRules,
      getRuleForPacket,
      palette,
      isProvided: true,
    }),
    [rules, setRules, importRules, exportRules, getRuleForPacket, palette]
  );

  return (
    <ColoringContext.Provider value={value}>{children}</ColoringContext.Provider>
  );
};

export const useColoring = () => useContext(ColoringContext);
