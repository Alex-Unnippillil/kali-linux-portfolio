'use client';

import { useEffect, useRef } from 'react';
import { create, all, type FactoryFunctionMap } from 'mathjs';

// mathjs `all` can be undefined in type definitions, assert the map exists
const math = create(all as FactoryFunctionMap);

type Token = {
  type: 'number' | 'id' | 'func' | 'operator' | 'paren' | 'comma';
  value: string;
  start?: number;
};

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (
      ch === '-' &&
      (tokens.length === 0 ||
        tokens[tokens.length - 1].type === 'operator' ||
        tokens[tokens.length - 1].value === '(')
    ) {
      let num = '-';
      const start = i;
      i += 1;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      tokens.push({ type: 'number', value: num, start });
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      const start = i;
      i += 1;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      tokens.push({ type: 'number', value: num, start });
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const start = i;
      const id = expr.slice(i).match(/^[A-Za-z]+/)! [0];
      i += id.length;
      if (expr[i] === '(') tokens.push({ type: 'func', value: id, start });
      else tokens.push({ type: 'id', value: id, start });
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      tokens.push({
        type: ch === '(' || ch === ')' ? 'paren' : ch === ',' ? 'comma' : 'operator',
        value: ch,
        start: i,
      });
      i += 1;
      continue;
    }
    const err: any = new Error(`Unexpected '${ch}'`);
    err.index = i;
    throw err;
  }
  return tokens;
}

function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const ops: Token[] = [];
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const rightAssoc: Record<string, boolean> = { '^': true };
  tokens.forEach((token) => {
    if (token.type === 'number' || token.type === 'id') {
      output.push(token);
    } else if (token.type === 'func') {
      ops.push(token);
    } else if (token.type === 'operator') {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (
          (top.type === 'operator' &&
            (rightAssoc[token.value]
              ? prec[token.value] < prec[top.value]
              : prec[token.value] <= prec[top.value])) ||
          top.type === 'func'
        ) {
          output.push(ops.pop()!);
        } else break;
      }
      ops.push(token);
    } else if (token.type === 'paren' && token.value === '(') {
      ops.push(token);
    } else if (token.type === 'paren' && token.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') {
        output.push(ops.pop()!);
      }
      if (!ops.length) {
        const err: any = new Error('Mismatched parenthesis');
        err.index = token.start;
        throw err;
      }
      ops.pop();
      if (ops.length && ops[ops.length - 1].type === 'func') output.push(ops.pop()!);
    }
  });
  while (ops.length) {
    const op = ops.pop()!;
    if (op.type === 'paren') {
      const err: any = new Error('Mismatched parenthesis');
      err.index = op.start;
      throw err;
    }
    output.push(op);
  }
  return output;
}

function evalRPN(rpn: Token[], x: number) {
  const stack: any[] = [];
  rpn.forEach((token) => {
    if (token.type === 'number') {
      stack.push(parseFloat(token.value));
    } else if (token.type === 'id') {
      if (token.value.toLowerCase() === 'x') stack.push(x);
      else if ((math as any)[token.value] !== undefined) stack.push((math as any)[token.value]);
      else stack.push(0);
    } else if (token.type === 'func') {
      const a = stack.pop();
      const fn = (math as any)[token.value];
      stack.push(fn ? fn(a) : a);
    } else if (token.type === 'operator') {
      const b = stack.pop();
      const a = stack.pop();
      let res: any;
      switch (token.value) {
        case '+':
          res = math.add(a, b);
          break;
        case '-':
          res = math.subtract(a, b);
          break;
        case '*':
          res = math.multiply(a, b);
          break;
        case '/':
          res = math.divide(a, b);
          break;
        case '^':
          res = math.pow(a, b);
          break;
        default:
          res = 0;
      }
      stack.push(res);
    }
  });
  const result = stack.pop();
  return typeof result === 'number' ? result : math.number(result);
}

function compile(expr: string) {
  try {
    const tokens = tokenize(expr);
    const rpn = toRPN(tokens);
    return (x: number) => {
      try {
        return evalRPN(rpn, x);
      } catch {
        return NaN;
      }
    };
  } catch {
    return () => NaN;
  }
}

interface GraphPanelProps {
  expression: string;
  width?: number;
  height?: number;
}

export default function GraphPanel({
  expression,
  width = 500,
  height = 500,
}: GraphPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const origin = useRef({ x: width / 2, y: height / 2 });
  const scale = useRef(40); // pixels per unit
  const compiled = useRef<(x: number) => number>(() => 0);
  const trace = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, origin.current.y);
    ctx.lineTo(canvas.width, origin.current.y);
    ctx.moveTo(origin.current.x, 0);
    ctx.lineTo(origin.current.x, canvas.height);
    ctx.stroke();

    // graph
    ctx.strokeStyle = '#f00';
    ctx.beginPath();
    let first = true;
    for (let px = 0; px < canvas.width; px += 1) {
      const x = (px - origin.current.x) / scale.current;
      const y = compiled.current(x);
      if (!Number.isFinite(y)) {
        first = true;
        continue;
      }
      const py = origin.current.y - y * scale.current;
      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    if (trace.current) {
      const tx = origin.current.x + trace.current.x * scale.current;
      const ty = origin.current.y - trace.current.y * scale.current;
      ctx.strokeStyle = '#00f';
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx, canvas.height);
      ctx.moveTo(0, ty);
      ctx.lineTo(canvas.width, ty);
      ctx.stroke();
      ctx.fillStyle = '#00f';
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillText(
        `(${trace.current.x.toFixed(2)}, ${trace.current.y.toFixed(2)})`,
        tx + 5,
        ty - 5,
      );
    }
  };

  useEffect(() => {
    compiled.current = compile(expression);
    draw();
  }, [expression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = () => canvas.getBoundingClientRect();

    const onMouseDown = (e: MouseEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current) {
        origin.current.x += e.clientX - last.current.x;
        origin.current.y += e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        draw();
      } else {
        const r = rect();
        const px = e.clientX - r.left;
        const x = (px - origin.current.x) / scale.current;
        const y = compiled.current(x);
        trace.current = Number.isFinite(y) ? { x, y } : null;
        draw();
      }
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = rect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const x = (px - origin.current.x) / scale.current;
      const y = (py - origin.current.y) / scale.current;
      const zoom = Math.exp(-e.deltaY / 200);
      scale.current *= zoom;
      origin.current.x = px - x * scale.current;
      origin.current.y = py - y * scale.current;
      draw();
    };
    const onLeave = () => {
      trace.current = null;
      draw();
    };
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mouseleave', onLeave);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        aria-label="graph"
      />
    );
  }

