import React, { useCallback, useMemo, useState } from 'react';

export interface CapstoneInstruction {
  address: number;
  mnemonic: string;
  opStr: string;
  bytes?: ArrayLike<number> | number[];
}

type Confidence = 'exact' | 'approx' | 'unknown';

interface PseudoLine {
  asm: string;
  pseudo: string;
  confidence: Confidence;
}

interface TranslationContext {
  lastCompare: { left: string; right: string } | null;
}

interface PseudoProps {
  instructions: CapstoneInstruction[];
}

const CONDITIONAL_MAP: Record<string, string> = {
  je: '==',
  jne: '!=',
  jz: '==',
  jnz: '!=',
  ja: '>',
  jae: '>=',
  jb: '<',
  jbe: '<=',
  jg: '>',
  jge: '>=',
  jl: '<',
  jle: '<=',
  jo: 'overflow',
  jno: '!overflow',
  js: '<0',
  jns: '>=0',
};

function parseOperands(opStr: string): string[] {
  if (!opStr) return [];
  return opStr
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeOperand(op: string): string {
  if (!op) return '?';
  const hexMatch = op.match(/0x[0-9a-f]+/i);
  if (hexMatch && hexMatch[0] === op) {
    return op.toLowerCase();
  }
  if (/^[0-9]+$/.test(op)) {
    const num = Number(op);
    if (!Number.isNaN(num)) {
      return `0x${num.toString(16)}`;
    }
  }
  return op;
}

function formatLabel(op: string): string {
  if (!op) return 'loc_unknown';
  if (op.startsWith('0x')) {
    return `loc_${op.replace(/[^0-9a-f]/gi, '').toLowerCase()}`;
  }
  return op.replace(/[^A-Za-z0-9_]/g, '_') || 'loc_unknown';
}

function formatCallTarget(op: string): string {
  if (!op) return 'sub_unknown';
  if (op.startsWith('0x')) {
    return `sub_${op.replace(/[^0-9a-f]/gi, '').toLowerCase()}`;
  }
  return op.replace(/[^A-Za-z0-9_]/g, '_');
}

function formatAsm(ins: CapstoneInstruction): string {
  const addr = `0x${ins.address.toString(16).padStart(8, '0')}`;
  const bytesArray = Array.isArray(ins.bytes)
    ? ins.bytes
    : ins.bytes
    ? Array.from(ins.bytes)
    : [];
  const bytes = bytesArray
    .map((b) => Number(b).toString(16).padStart(2, '0'))
    .join(' ');
  const mnemonic = ins.mnemonic || '';
  const ops = ins.opStr || '';
  return `${addr}: ${bytes.padEnd(20, ' ')}\t${mnemonic} ${ops}`.trim();
}

function translateInstruction(
  ins: CapstoneInstruction,
  context: TranslationContext
): { text: string; confidence: Confidence } {
  const mnemonic = (ins.mnemonic || '').toLowerCase();
  const operands = parseOperands(ins.opStr || '');
  const [dest, src] = operands.map(normalizeOperand);

  switch (mnemonic) {
    case 'mov':
      if (operands.length === 2) {
        return { text: `${normalizeOperand(dest)} = ${normalizeOperand(src)};`, confidence: 'exact' };
      }
      break;
    case 'lea':
      if (operands.length === 2) {
        return {
          text: `${normalizeOperand(dest)} = &(${normalizeOperand(src)}); // addr`,
          confidence: 'approx',
        };
      }
      break;
    case 'add':
      if (operands.length === 2) {
        return { text: `${dest} += ${src};`, confidence: 'exact' };
      }
      break;
    case 'sub':
      if (operands.length === 2) {
        return { text: `${dest} -= ${src};`, confidence: 'exact' };
      }
      break;
    case 'imul':
    case 'mul':
      if (operands.length >= 2) {
        return { text: `${dest} *= ${src};`, confidence: 'approx' };
      }
      break;
    case 'idiv':
    case 'div':
      return {
        text: `${operands[0] ? normalizeOperand(operands[0]) : 'eax'} /= ${operands[1] ? normalizeOperand(operands[1]) : 'op'}; // quotient`,
        confidence: 'approx',
      };
    case 'inc':
      if (operands.length === 1) {
        return { text: `${normalizeOperand(operands[0])}++;`, confidence: 'exact' };
      }
      break;
    case 'dec':
      if (operands.length === 1) {
        return { text: `${normalizeOperand(operands[0])}--;`, confidence: 'exact' };
      }
      break;
    case 'xor':
      if (operands.length === 2 && operands[0] === operands[1]) {
        return { text: `${normalizeOperand(dest)} = 0;`, confidence: 'exact' };
      }
      if (operands.length === 2) {
        return { text: `${dest} ^= ${src};`, confidence: 'approx' };
      }
      break;
    case 'and':
      if (operands.length === 2) {
        return { text: `${dest} &= ${src};`, confidence: 'approx' };
      }
      break;
    case 'or':
      if (operands.length === 2) {
        return { text: `${dest} |= ${src};`, confidence: 'approx' };
      }
      break;
    case 'cmp':
      context.lastCompare = {
        left: operands[0] ? normalizeOperand(operands[0]) : 'op0',
        right: operands[1] ? normalizeOperand(operands[1]) : 'op1',
      };
      return {
        text: `// compare ${operands.map(normalizeOperand).join(', ')}`,
        confidence: 'approx',
      };
    case 'test':
      context.lastCompare = {
        left: operands[0] ? normalizeOperand(operands[0]) : 'op0',
        right: operands[1] ? normalizeOperand(operands[1]) : 'op1',
      };
      return {
        text: `// test ${operands.map(normalizeOperand).join(', ')}`,
        confidence: 'approx',
      };
    case 'call': {
      const target = formatCallTarget(operands[0] || '');
      context.lastCompare = null;
      return { text: `${target}();`, confidence: 'approx' };
    }
    case 'ret':
      context.lastCompare = null;
      return { text: 'return;', confidence: 'exact' };
    case 'push':
      return {
        text: `stack.push(${normalizeOperand(operands[0] || '')});`,
        confidence: 'approx',
      };
    case 'pop':
      return {
        text: `${normalizeOperand(operands[0] || 'dest')} = stack.pop();`,
        confidence: 'approx',
      };
    case 'nop':
      return { text: '/* nop */', confidence: 'exact' };
    case 'jmp': {
      const label = formatLabel(operands[0] || '');
      context.lastCompare = null;
      return { text: `goto ${label}; // direct`, confidence: 'approx' };
    }
    default:
      if (mnemonic.startsWith('j')) {
        const label = formatLabel(operands[0] || '');
        const cond = CONDITIONAL_MAP[mnemonic];
        let condition = `flag(${mnemonic.toUpperCase()})`;
        if (cond && context.lastCompare) {
          const { left, right } = context.lastCompare;
          if (cond === 'overflow' || cond === '!overflow') {
            condition = cond === 'overflow' ? 'overflowFlag == 1' : 'overflowFlag == 0';
          } else if (cond === '<0' || cond === '>=0') {
            condition = `${context.lastCompare.left} ${cond}`;
          } else {
            condition = `${left} ${cond} ${right}`;
          }
        } else if (cond) {
          condition = cond.includes('overflow')
            ? (cond === 'overflow' ? 'overflowFlag == 1' : 'overflowFlag == 0')
            : `/* compare missing */ ${cond}`;
        }
        context.lastCompare = null;
        return {
          text: `if (${condition}) goto ${label};`,
          confidence: 'approx',
        };
      }
  }

  context.lastCompare = null;
  return {
    text: `/* unsupported: ${mnemonic} ${operands.join(', ')} */`,
    confidence: 'unknown',
  };
}

const Pseudo: React.FC<PseudoProps> = ({ instructions }) => {
  const [mode, setMode] = useState<'linked' | 'pseudo' | 'asm'>('linked');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const lines = useMemo<PseudoLine[]>(() => {
    const context: TranslationContext = { lastCompare: null };
    return instructions.map((ins) => {
      const { text, confidence } = translateInstruction(ins, context);
      return {
        asm: formatAsm(ins),
        pseudo: text,
        confidence,
      };
    });
  }, [instructions]);

  const handleModeChange = useCallback(
    (next: 'linked' | 'pseudo' | 'asm') => () => setMode(next),
    []
  );

  if (!instructions.length) {
    return null;
  }

  const showPseudo = mode === 'linked' || mode === 'pseudo';
  const showAsm = mode === 'linked' || mode === 'asm';

  const columnBase = 'flex-1 overflow-auto min-h-0';

  return (
    <div className="flex flex-col h-80 border-t border-gray-700 bg-gray-800 text-xs md:text-sm">
      <div className="flex items-center justify-between border-b border-gray-700 px-2 py-1">
        <span className="font-semibold">Pseudocode synthesis</span>
        <div role="group" aria-label="View mode" className="inline-flex rounded bg-gray-900/60">
          {[
            ['linked', 'Linked'],
            ['pseudo', 'Pseudo'],
            ['asm', 'Assembly'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={handleModeChange(value as 'linked' | 'pseudo' | 'asm')}
              className={`px-2 py-1 text-xs border border-gray-700 first:rounded-l last:rounded-r ${
                mode === value ? 'bg-yellow-600 text-black' : 'text-gray-200'
              }`}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {showPseudo && (
          <div
            className={`${columnBase} ${showAsm ? 'border-r border-gray-700' : ''}`}
            aria-label="Pseudocode view"
            role="list"
          >
            {lines.map((line, idx) => (
              <div
                key={`pseudo-${idx}`}
                role="listitem"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className={`flex items-baseline gap-2 px-2 py-1 whitespace-pre-wrap cursor-default ${
                  hoverIndex === idx ? 'bg-yellow-700/40' : ''
                }`}
              >
                <code className="flex-1">{line.pseudo}</code>
                {line.confidence !== 'exact' && (
                  <span
                    className={`uppercase tracking-wide text-[0.6rem] ${
                      line.confidence === 'approx' ? 'text-amber-300' : 'text-red-300'
                    }`}
                  >
                    {line.confidence === 'approx' ? 'approx' : 'unknown'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {showAsm && (
          <div className={columnBase} aria-label="Disassembly view" role="list">
            {lines.map((line, idx) => (
              <div
                key={`asm-${idx}`}
                role="listitem"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className={`px-2 py-1 whitespace-pre cursor-default ${
                  hoverIndex === idx ? 'bg-yellow-700/40' : ''
                }`}
              >
                <code>{line.asm}</code>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Pseudo);
