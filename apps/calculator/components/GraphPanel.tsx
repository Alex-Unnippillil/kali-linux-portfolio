'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { create, all } from 'mathjs';

const math = create(all);

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const origin = useRef({ x: width / 2, y: height / 2 });
  const scale = useRef(40); // pixels per unit
  const compiled = useRef<(x: number) => number>(() => 0);
  const trace = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const tapRef = useRef<{ id: number; x: number; y: number; time: number } | null>(null);
  const [ariaTrace, setAriaTrace] = useState('');
  const instructionsId = useId();
  const liveRegionId = `${instructionsId}-live`;

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
    if (trace.current) {
      const y = compiled.current(trace.current.x);
      if (Number.isFinite(y)) {
        trace.current = { x: trace.current.x, y };
        setAriaTrace(
          `Trace at (${trace.current.x.toFixed(2)}, ${trace.current.y.toFixed(2)})`,
        );
      } else {
        trace.current = null;
        setAriaTrace('');
      }
    }
    draw();
  }, [expression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = 'pan-x pan-y';

    const rect = () => canvas.getBoundingClientRect();
    const toCanvas = (clientX: number, clientY: number) => {
      const r = rect();
      return { x: clientX - r.left, y: clientY - r.top };
    };
    const pointerPositions = new Map<number, { x: number; y: number }>();
    let multiCenter: { x: number; y: number } | null = null;

    const getCentroid = () => {
      let sumX = 0;
      let sumY = 0;
      pointerPositions.forEach((pos) => {
        sumX += pos.x;
        sumY += pos.y;
      });
      const count = pointerPositions.size || 1;
      return { x: sumX / count, y: sumY / count };
    };

    const setTraceFromPoint = (clientX: number, clientY: number, announce = false) => {
      const { x: px } = toCanvas(clientX, clientY);
      const graphX = (px - origin.current.x) / scale.current;
      const graphY = compiled.current(graphX);
      if (Number.isFinite(graphY)) {
        trace.current = { x: graphX, y: graphY };
        if (announce) {
          setAriaTrace(`Trace at (${trace.current.x.toFixed(2)}, ${trace.current.y.toFixed(2)})`);
        }
      } else {
        trace.current = null;
        if (announce) {
          setAriaTrace('Trace unavailable at that position');
        }
      }
      draw();
    };

    const clearTrace = (announce = false) => {
      trace.current = null;
      if (announce) setAriaTrace('Trace cleared');
      draw();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        if (event.button !== 0) return;
        dragging.current = true;
        last.current = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
        setTraceFromPoint(event.clientX, event.clientY);
        return;
      }

      pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointerPositions.size === 1) {
        tapRef.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: performance.now(),
        };
      } else {
        tapRef.current = null;
      }
      if (pointerPositions.size >= 2) {
        multiCenter = getCentroid();
        canvas.style.touchAction = 'none';
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        if (dragging.current) {
          origin.current.x += event.clientX - last.current.x;
          origin.current.y += event.clientY - last.current.y;
          last.current = { x: event.clientX, y: event.clientY };
          draw();
        } else {
          setTraceFromPoint(event.clientX, event.clientY);
        }
        return;
      }

      if (pointerPositions.has(event.pointerId)) {
        pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      if (pointerPositions.size >= 2 && multiCenter) {
        const next = getCentroid();
        origin.current.x += next.x - multiCenter.x;
        origin.current.y += next.y - multiCenter.y;
        multiCenter = next;
        draw();
      } else if (pointerPositions.size === 1 && tapRef.current?.id === event.pointerId) {
        const dx = event.clientX - tapRef.current.x;
        const dy = event.clientY - tapRef.current.y;
        if (Math.hypot(dx, dy) > 10) {
          tapRef.current = null;
        }
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        if (dragging.current) {
          dragging.current = false;
          if (canvas.hasPointerCapture?.(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
        }
        return;
      }

      pointerPositions.delete(event.pointerId);
      if (pointerPositions.size < 2) {
        multiCenter = null;
        canvas.style.touchAction = 'pan-x pan-y';
      }

      if (tapRef.current?.id === event.pointerId) {
        if (performance.now() - tapRef.current.time < 500) {
          setTraceFromPoint(event.clientX, event.clientY, true);
        }
        tapRef.current = null;
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        dragging.current = false;
        return;
      }
      pointerPositions.delete(event.pointerId);
      tapRef.current = null;
      if (pointerPositions.size < 2) {
        multiCenter = null;
        canvas.style.touchAction = 'pan-x pan-y';
      }
    };

    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && !dragging.current) {
        clearTrace();
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('pointerleave', onPointerLeave);

    return () => {
      canvas.style.touchAction = '';
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const panStep = 20;
    const zoomFactor = 1.1;
    const traceStep = 0.25;

    if (event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const baseX = trace.current
        ? trace.current.x
        : (canvas.width / 2 - origin.current.x) / scale.current;
      const nextX = baseX + direction * traceStep;
      const nextY = compiled.current(nextX);
      if (Number.isFinite(nextY)) {
        trace.current = { x: nextX, y: nextY };
        setAriaTrace(`Trace at (${nextX.toFixed(2)}, ${nextY.toFixed(2)})`);
        draw();
      } else {
        trace.current = null;
        setAriaTrace('Trace unavailable at that position');
        draw();
      }
      return;
    }

    const zoomAtCenter = (factor: number) => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const graphX = (centerX - origin.current.x) / scale.current;
      const graphY = (centerY - origin.current.y) / scale.current;
      scale.current *= factor;
      origin.current.x = centerX - graphX * scale.current;
      origin.current.y = centerY - graphY * scale.current;
      draw();
    };

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        origin.current.y -= panStep;
        draw();
        break;
      case 'ArrowDown':
        event.preventDefault();
        origin.current.y += panStep;
        draw();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        origin.current.x -= panStep;
        draw();
        break;
      case 'ArrowRight':
        event.preventDefault();
        origin.current.x += panStep;
        draw();
        break;
      case '+':
      case '=':
      case 'Add':
        event.preventDefault();
        zoomAtCenter(zoomFactor);
        break;
      case '-':
      case '_':
      case 'Subtract':
        event.preventDefault();
        zoomAtCenter(1 / zoomFactor);
        break;
      case '0':
      case 'Home':
        event.preventDefault();
        origin.current.x = canvas.width / 2;
        origin.current.y = canvas.height / 2;
        scale.current = 40;
        setAriaTrace('View reset');
        draw();
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (trace.current) {
          trace.current = null;
          setAriaTrace('Trace cleared');
          draw();
        } else {
          const centerX = canvas.width / 2;
          const graphX = (centerX - origin.current.x) / scale.current;
          const graphY = compiled.current(graphX);
          if (Number.isFinite(graphY)) {
            trace.current = { x: graphX, y: graphY };
            setAriaTrace(`Trace at (${graphX.toFixed(2)}, ${graphY.toFixed(2)})`);
            draw();
          } else {
            setAriaTrace('Trace unavailable at center');
          }
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p id={instructionsId} className="sr-only">
        Use arrow keys to pan the graph, plus or minus to zoom, and zero to reset the view. Press
        Enter or Space to toggle a trace at the center. Hold Shift and press the left or right arrow
        keys to move the trace along the curve. On touch devices, tap to reveal coordinates and use
        two fingers to pan without blocking page scroll.
      </p>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label="Graph panel"
        aria-describedby={`${instructionsId} ${liveRegionId}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      />
      <div id={liveRegionId} aria-live="polite" className="sr-only">
        {ariaTrace}
      </div>
    </div>
  );
}

