import React, { useEffect, useRef } from 'react';
const MAX_SAMPLES = 120;
const MAX_MS = 50; // cap graph at 50ms (20 FPS)
export const exportPerfReport = (samples) => {
    if (!samples.length || typeof document === 'undefined')
        return;
    const avgDt = samples.reduce((a, s) => a + s.dt, 0) / samples.length;
    const avgFps = 1000 / avgDt;
    const report = {
        avgFps,
        avgFrameMs: avgDt,
        samples: samples.map((s) => ({ t: Math.round(s.t), dt: +s.dt.toFixed(2) })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'perf-report.json';
    a.click();
    URL.revokeObjectURL(url);
};
const PerfOverlay = () => {
    const canvasRef = useRef(null);
    const samplesRef = useRef([]);
    const lastRef = useRef(0);
    const rafRef = useRef();
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        let mounted = true;
        const loop = (now) => {
            if (!mounted)
                return;
            if (lastRef.current) {
                const dt = now - lastRef.current;
                const samples = samplesRef.current;
                samples.push({ t: now, dt });
                if (samples.length > MAX_SAMPLES)
                    samples.shift();
                if (ctx && canvas) {
                    const w = canvas.width;
                    const h = canvas.height;
                    ctx.clearRect(0, 0, w, h);
                    ctx.strokeStyle = '#00ff00';
                    ctx.beginPath();
                    samples.forEach((s, i) => {
                        const x = (i / (samples.length - 1 || 1)) * w;
                        const clamped = Math.min(s.dt, MAX_MS);
                        const y = h - (clamped / MAX_MS) * h;
                        if (i === 0)
                            ctx.moveTo(x, y);
                        else
                            ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                    const latest = samples[samples.length - 1];
                    const fps = latest ? (1000 / latest.dt).toFixed(1) : '0';
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '12px sans-serif';
                    ctx.fillText(`${fps} FPS`, 4, 12);
                }
            }
            lastRef.current = now;
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            mounted = false;
            if (rafRef.current)
                cancelAnimationFrame(rafRef.current);
        };
    }, []);
    const handleExport = () => exportPerfReport(samplesRef.current);
    return (<div className="absolute bottom-2 left-2 z-50 bg-black bg-opacity-50 text-white p-1 text-xs space-y-1">
      <canvas ref={canvasRef} width={150} height={60} className="block"/>
      <button type="button" onClick={handleExport} className="underline">
        Export JSON
      </button>
    </div>);
};
export default PerfOverlay;
