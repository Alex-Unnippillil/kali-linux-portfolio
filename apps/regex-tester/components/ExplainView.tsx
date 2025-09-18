'use client';

import { useMemo } from 'react';
import { RegExpParser } from '@eslint-community/regexpp';
import type { AST } from '@eslint-community/regexpp';

interface ExplainViewProps {
  pattern: string;
  flags: string;
}

interface ExplanationNode {
  id: string;
  title: string;
  description?: string;
  snippet?: string;
  children?: ExplanationNode[];
}

type AlternativeContext = 'pattern' | 'group' | 'lookaround';

const CONTROL_NAMES: Record<number, string> = {
  0: 'Null',
  8: 'Backspace',
  9: 'Tab',
  10: 'Line feed',
  11: 'Vertical tab',
  12: 'Form feed',
  13: 'Carriage return',
  27: 'Escape',
};

const FLAG_LABELS: Record<string, string> = {
  d: 'indices (d)',
  g: 'global (g)',
  i: 'ignore case (i)',
  m: 'multiline (m)',
  s: 'dotAll (s)',
  u: 'unicode (u)',
  v: 'unicode sets (v)',
  y: 'sticky (y)',
};

function escapeSnippet(raw: string): string {
  return raw
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\v/g, '\\v')
    .replace(/\u0000/g, '\\0');
}

function formatCodePoint(value: number): string {
  const hex = value.toString(16).toUpperCase();
  const padded = hex.padStart(Math.max(4, hex.length), '0');
  const char = value <= 0x10ffff ? String.fromCodePoint(value) : '';
  const isPrintable = value >= 0x20 && value !== 0x7f;
  const controlName = CONTROL_NAMES[value];

  if (isPrintable) {
    return `"${char}" (U+${padded})`;
  }

  if (controlName) {
    return `${controlName} (U+${padded})`;
  }

  return `U+${padded}`;
}

function describeFlags(flags: string): string {
  if (!flags) {
    return 'Flags: none';
  }

  const labels = Array.from(new Set(flags.split('')))
    .map((flag) => FLAG_LABELS[flag] ?? `${flag}`)
    .join(', ');

  return labels ? `Flags: ${labels}` : `Flags: ${flags}`;
}

function buildTree(pattern: AST.Pattern, flags: string): ExplanationNode {
  let captureIndex = 1;
  let nextId = 0;

  const makeId = () => `regex-node-${nextId++}`;

  const createNode = (
    title: string,
    {
      description,
      snippet,
      children,
    }: {
      description?: string;
      snippet?: string;
      children?: ExplanationNode[];
    } = {},
  ): ExplanationNode => ({
    id: makeId(),
    title,
    description,
    snippet,
    children: children?.filter(Boolean),
  });

  const buildAlternative = (
    alternative: AST.Alternative,
    index: number,
    total: number,
    context: AlternativeContext,
  ): ExplanationNode => {
    const rawSnippet = alternative.raw;
    const hasContent = rawSnippet.length > 0;

    let title: string;
    if (total > 1) {
      title = context === 'pattern' ? `Alternative ${index + 1}` : `Option ${index + 1}`;
    } else {
      title = 'Sequence';
    }

    return createNode(title, {
      description: hasContent ? undefined : 'Matches the empty string',
      snippet: hasContent ? escapeSnippet(rawSnippet) : 'ε',
      children: alternative.elements.map((element) => buildElement(element)),
    });
  };

  const describeModifierFlags = (flagsNode: AST.ModifierFlags | null): string | undefined => {
    if (!flagsNode) {
      return undefined;
    }

    const flagsDescriptions: string[] = [];
    if (flagsNode.ignoreCase) flagsDescriptions.push('ignore case');
    if (flagsNode.multiline) flagsDescriptions.push('multiline');
    if (flagsNode.dotAll) flagsDescriptions.push('dotAll');

    if (!flagsDescriptions.length) {
      return undefined;
    }

    return `Applies modifiers: ${flagsDescriptions.join(', ')}`;
  };

  const buildCharacterSet = (set: AST.CharacterSet): ExplanationNode => {
    if (set.kind === 'any') {
      return createNode('Any character', {
        description: 'Matches any character except line terminators',
        snippet: escapeSnippet(set.raw),
      });
    }

    if (set.kind === 'digit' || set.kind === 'space' || set.kind === 'word') {
      const kindLabel =
        set.kind === 'digit' ? 'digit' : set.kind === 'space' ? 'whitespace' : 'word';
      const negate = set.negate ? 'non-' : '';
      return createNode(`${set.negate ? 'Negated' : 'Character'} set`, {
        description: `Matches ${negate}${kindLabel} characters`,
        snippet: escapeSnippet(set.raw),
      });
    }

    if (set.kind === 'property') {
      const property = `${set.key}${set.value ? `=${set.value}` : ''}`;
      const baseDescription = set.strings
        ? `Matches ${set.negate ? 'strings without' : 'strings with'} property ${property}`
        : `Matches ${set.negate ? 'characters without' : 'characters with'} property ${property}`;
      return createNode(set.negate ? 'Negated Unicode property' : 'Unicode property', {
        description: baseDescription,
        snippet: escapeSnippet(set.raw),
      });
    }

    return createNode('Character set', {
      snippet: escapeSnippet(set.raw),
    });
  };

  const buildCharacterRange = (range: AST.CharacterClassRange): ExplanationNode => {
    return createNode('Range', {
      description: `${formatCodePoint(range.min.value)} through ${formatCodePoint(range.max.value)}`,
      snippet: escapeSnippet(range.raw),
      children: [
        createNode('Start', {
          description: formatCodePoint(range.min.value),
          snippet: escapeSnippet(range.min.raw),
        }),
        createNode('End', {
          description: formatCodePoint(range.max.value),
          snippet: escapeSnippet(range.max.raw),
        }),
      ],
    });
  };

  const buildClassElement = (element: AST.CharacterClassElement): ExplanationNode => {
    switch (element.type) {
      case 'Character':
        return createNode('Literal', {
          description: formatCodePoint(element.value),
          snippet: escapeSnippet(element.raw),
        });
      case 'CharacterClassRange':
        return buildCharacterRange(element);
      case 'CharacterSet':
        return buildCharacterSet(element);
      case 'CharacterClass':
        return buildCharacterClass(element);
      case 'ClassIntersection':
        return createNode('Class intersection', {
          snippet: escapeSnippet(element.raw),
        });
      case 'ClassSubtraction':
        return createNode('Class subtraction', {
          snippet: escapeSnippet(element.raw),
        });
      case 'ClassStringDisjunction':
        return createNode('String alternatives', {
          snippet: escapeSnippet(element.raw),
        });
      case 'ExpressionCharacterClass':
        return createNode('Expression character class', {
          snippet: escapeSnippet(element.raw),
        });
      default:
        return createNode(element.type, {
          snippet: escapeSnippet(element.raw),
        });
    }
  };

  const buildCharacterClass = (characterClass: AST.CharacterClass): ExplanationNode => {
    return createNode(characterClass.negate ? 'Negated character class' : 'Character class', {
      description: characterClass.negate
        ? 'Matches characters that are not in this set'
        : 'Matches one of the listed characters',
      snippet: escapeSnippet(characterClass.raw),
      children: characterClass.elements.map((element) => buildClassElement(element)),
    });
  };

  const buildAssertion = (assertion: AST.Assertion): ExplanationNode => {
    switch (assertion.kind) {
      case 'start':
        return createNode('Start assertion', {
          description: 'Matches at the beginning of the input',
          snippet: escapeSnippet(assertion.raw),
        });
      case 'end':
        return createNode('End assertion', {
          description: 'Matches at the end of the input',
          snippet: escapeSnippet(assertion.raw),
        });
      case 'word':
        return createNode(assertion.negate ? 'Non-word boundary' : 'Word boundary', {
          description: assertion.negate
            ? 'Position between word and non-word characters is not allowed'
            : 'Position between word and non-word characters',
          snippet: escapeSnippet(assertion.raw),
        });
      case 'lookahead':
      case 'lookbehind': {
        const title = `${assertion.negate ? 'Negative' : 'Positive'} ${
          assertion.kind === 'lookahead' ? 'lookahead' : 'lookbehind'
        }`;
        return createNode(title, {
          description: assertion.negate ? 'Requires the pattern to not match' : 'Requires the pattern to match',
          snippet: escapeSnippet(assertion.raw),
          children: assertion.alternatives.map((alt, index) =>
            buildAlternative(alt, index, assertion.alternatives.length, 'lookaround'),
          ),
        });
      }
      default:
        return createNode('Assertion', {
          snippet: escapeSnippet(assertion.raw),
        });
    }
  };

  const describeQuantifier = (quantifier: AST.Quantifier): string => {
    if (quantifier.min === 0 && quantifier.max === 1) {
      return `Zero or one time${quantifier.greedy ? '' : ' (lazy)'}`;
    }
    if (quantifier.min === 0 && quantifier.max === Infinity) {
      return `Zero or more times${quantifier.greedy ? '' : ' (lazy)'}`;
    }
    if (quantifier.min === 1 && quantifier.max === Infinity) {
      return `One or more times${quantifier.greedy ? '' : ' (lazy)'}`;
    }
    if (quantifier.min === quantifier.max) {
      return `Exactly ${quantifier.min} time${quantifier.min === 1 ? '' : 's'}${
        quantifier.greedy ? '' : ' (lazy)'
      }`;
    }
    if (quantifier.max === Infinity) {
      return `At least ${quantifier.min} times${quantifier.greedy ? '' : ' (lazy)'}`;
    }
    return `Between ${quantifier.min} and ${quantifier.max} times${
      quantifier.greedy ? '' : ' (lazy)'
    }`;
  };

  const buildQuantifier = (quantifier: AST.Quantifier): ExplanationNode => {
    return createNode('Quantifier', {
      description: describeQuantifier(quantifier),
      snippet: escapeSnippet(quantifier.raw),
      children: [buildElement(quantifier.element)],
    });
  };

  const buildBackreference = (backreference: AST.Backreference): ExplanationNode => {
    const resolved = Array.isArray(backreference.resolved)
      ? backreference.resolved.map((group) => escapeSnippet(group.raw)).join(', ')
      : escapeSnippet(backreference.resolved.raw);

    return createNode('Backreference', {
      description: `Refers to ${Array.isArray(backreference.resolved) ? 'groups' : 'group'} ${resolved}`,
      snippet: escapeSnippet(backreference.raw),
    });
  };

  const buildElement = (element: AST.Element): ExplanationNode => {
    switch (element.type) {
      case 'Character':
        return createNode('Literal', {
          description: formatCodePoint(element.value),
          snippet: escapeSnippet(element.raw),
        });
      case 'CharacterSet':
        return buildCharacterSet(element);
      case 'CharacterClass':
        return buildCharacterClass(element);
      case 'Quantifier':
        return buildQuantifier(element);
      case 'CapturingGroup': {
        const index = captureIndex++;
        const nameSuffix = element.name ? ` <${element.name}>` : '';
        return createNode(`Capturing group #${index}${nameSuffix}`, {
          snippet: escapeSnippet(element.raw),
          children: element.alternatives.map((alt, altIndex) =>
            buildAlternative(alt, altIndex, element.alternatives.length, 'group'),
          ),
        });
      }
      case 'Group':
        return createNode('Non-capturing group', {
          description: describeModifierFlags(element.modifiers),
          snippet: escapeSnippet(element.raw),
          children: element.alternatives.map((alt, altIndex) =>
            buildAlternative(alt, altIndex, element.alternatives.length, 'group'),
          ),
        });
      case 'Assertion':
        return buildAssertion(element);
      case 'Backreference':
        return buildBackreference(element);
      case 'ExpressionCharacterClass':
        return createNode('Expression character class', {
          snippet: escapeSnippet(element.raw),
        });
      default:
        return createNode(element.type, {
          snippet: escapeSnippet(element.raw),
        });
    }
  };

  const rootChildren = pattern.alternatives.map((alternative, index) =>
    buildAlternative(alternative, index, pattern.alternatives.length, 'pattern'),
  );

  const rootDescriptionParts = [describeFlags(flags)];
  if (!pattern.raw.length) {
    rootDescriptionParts.push('Empty pattern matches the empty string');
  }

  return createNode('Pattern', {
    description: rootDescriptionParts.filter(Boolean).join(' · '),
    snippet: escapeSnippet(pattern.raw),
    children: rootChildren,
  });
}

const ExplainView: React.FC<ExplainViewProps> = ({ pattern, flags }) => {
  const result = useMemo(() => {
    if (!pattern) {
      return { status: 'empty' as const };
    }

    try {
      const unicode = flags.includes('u') || flags.includes('v');
      const unicodeSets = flags.includes('v');
      const parser = new RegExpParser({ ecmaVersion: 2025 });
      const ast = parser.parsePattern(pattern, 0, pattern.length, {
        unicode,
        unicodeSets,
      });
      return {
        status: 'success' as const,
        tree: buildTree(ast, flags),
      };
    } catch (error) {
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'Failed to parse pattern',
      };
    }
  }, [pattern, flags]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Regex structure</h2>
        <p className="text-xs text-slate-400">Understand how each token fits together.</p>
      </div>
      <div className="mt-3 flex-1 overflow-y-auto pr-1">
        {result.status === 'empty' ? (
          <p className="text-sm text-slate-400">Enter a pattern to see its parsed structure.</p>
        ) : result.status === 'error' ? (
          <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            <p className="font-semibold">Parser error</p>
            <p className="mt-1 whitespace-pre-wrap text-red-100">{result.message}</p>
          </div>
        ) : (
          <ul className="space-y-3" role="tree">
            {renderNode(result.tree)}
          </ul>
        )}
      </div>
    </div>
  );
};

function renderNode(node: ExplanationNode): JSX.Element {
  return (
    <li key={node.id} className="border-l border-slate-700 pl-3" role="treeitem">
      <div className="rounded bg-slate-800/60 px-2 py-1">
        <div className="text-sm font-semibold text-sky-200">{node.title}</div>
        {node.description ? (
          <p className="text-xs text-slate-300">{node.description}</p>
        ) : null}
        {node.snippet ? (
          <code className="mt-1 inline-block rounded bg-slate-900 px-1 py-0.5 text-xs text-emerald-200">
            {node.snippet}
          </code>
        ) : null}
      </div>
      {node.children && node.children.length ? (
        <ul className="mt-2 space-y-2 pl-2" role="group">
          {node.children.map((child) => renderNode(child))}
        </ul>
      ) : null}
    </li>
  );
}

export default ExplainView;
