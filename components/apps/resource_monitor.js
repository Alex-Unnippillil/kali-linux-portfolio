import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const MAX_POINTS = 60;
const LABEL_COLOR_VAR = '--resource-chart-label-color';

const formatUnitSuffix = (unit = '') => {
  if (!unit) return '';
  return unit.startsWith('%') ? unit : ` ${unit}`;
};

const getCssVariable = (element, variableName, fallback) => {
  if (!element || typeof window === 'undefined' || typeof getComputedStyle !== 'function') {
    return fallback;
  }
  const value = getComputedStyle(element).getPropertyValue(variableName);
  return value ? value.trim() || fallback : fallback;
};

function drawChart(canvas, values, strokeColor, label, unit, maxVal, labelColor, size) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const logicalWidth = size?.width || canvas.width / ratio || 0;
  const logicalHeight = size?.height || canvas.height / ratio || 0;
  const width = Math.max(1, Math.round(logicalWidth * ratio));
  const height = Math.max(1, Math.round(logicalHeight * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.save();
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1 || 1)) * logicalWidth;
    const y = logicalHeight - (v / maxVal) * logicalHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const latest = values[values.length - 1] || 0;
  const suffix = formatUnitSuffix(unit);
  ctx.fillStyle = labelColor;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${label}: ${latest.toFixed(1)}${suffix}`, 4, 12);
  ctx.restore();
}

const ResourceMonitor = () => {
  const cpuCanvas = useRef(null);
  const memCanvas = useRef(null);
  const fpsCanvas = useRef(null);
  const netCanvas = useRef(null);
  const workerRef = useRef(null);

  const dataRef = useRef({ cpu: [], mem: [], fps: [], net: [] });
  const displayRef = useRef({ cpu: [], mem: [], fps: [], net: [] });
  const timestampsRef = useRef({ cpu: [], mem: [], fps: [], net: [] });
  const animRef = useRef();
  const lastDrawRef = useRef(0);
  const THROTTLE_MS = 1000;

  const [paused, setPaused] = useState(false);
  const [stress, setStress] = useState(false);
  const [fps, setFps] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [latestSamples, setLatestSamples] = useState({
    cpu: null,
    mem: null,
    fps: null,
    net: null,
  });
  const [chartSizes, setChartSizes] = useState({
    cpu: { width: 300, height: 100 },
    mem: { width: 300, height: 100 },
    fps: { width: 300, height: 100 },
    net: { width: 300, height: 100 },
  });

  const stressWindows = useRef([]);
  const stressEls = useRef([]);
  const containerRef = useRef(null);
  const chartContainersRef = useRef({ cpu: null, mem: null, fps: null, net: null });
  const resizeObserverRef = useRef(null);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (event) => setPrefersReducedMotion(event.matches);
    setPrefersReducedMotion(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }
    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  const chartConfigs = useMemo(
    () => [
      {
        key: 'cpu',
        canvasRef: cpuCanvas,
        ariaLabel: 'CPU usage chart',
        tooltipLabel: 'CPU usage',
        legendLabel: 'CPU',
        unit: '%',
        max: 100,
        strokeVar: '--resource-chart-cpu-stroke',
        fallbackColor: '#00ff00',
      },
      {
        key: 'mem',
        canvasRef: memCanvas,
        ariaLabel: 'Memory usage chart',
        tooltipLabel: 'Memory usage',
        legendLabel: 'Memory',
        unit: '%',
        max: 100,
        strokeVar: '--resource-chart-mem-stroke',
        fallbackColor: '#ffd700',
      },
      {
        key: 'fps',
        canvasRef: fpsCanvas,
        ariaLabel: 'FPS chart',
        tooltipLabel: 'Frame rate',
        legendLabel: 'FPS',
        unit: 'fps',
        max: 120,
        strokeVar: '--resource-chart-fps-stroke',
        fallbackColor: '#00ffff',
      },
      {
        key: 'net',
        canvasRef: netCanvas,
        ariaLabel: 'Network speed chart',
        tooltipLabel: 'Network throughput',
        legendLabel: 'Network',
        unit: 'Mbps',
        max: 100,
        strokeVar: '--resource-chart-net-stroke',
        fallbackColor: '#ff00ff',
      },
    ],
    [cpuCanvas, memCanvas, fpsCanvas, netCanvas],
  );

  const updateCanvasSize = useCallback((key, width, height) => {
    setChartSizes((prev) => {
      if (!prev[key]) return prev;
      const nextWidth = Math.max(1, Math.round(width));
      const nextHeight = Math.max(1, Math.round(height));
      if (nextWidth === 0 || nextHeight === 0) return prev;
      if (
        prev[key].width === nextWidth &&
        prev[key].height === nextHeight
      ) {
        return prev;
      }
      return {
        ...prev,
        [key]: { width: nextWidth, height: nextHeight },
      };
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => {
        Object.entries(chartContainersRef.current).forEach(([key, node]) => {
          if (!node) return;
          const rect = node.getBoundingClientRect();
          if (rect.width && rect.height) {
            updateCanvasSize(key, rect.width, rect.height);
          }
        });
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const key = entry.target.getAttribute('data-chart-key');
        if (!key) return;
        const { width, height } = entry.contentRect;
        updateCanvasSize(key, width, height);
      });
    });
    resizeObserverRef.current = observer;
    Object.values(chartContainersRef.current).forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [updateCanvasSize]);

  const registerContainer = useCallback(
    (key) => (node) => {
      const existing = chartContainersRef.current[key];
      if (resizeObserverRef.current && existing) {
        resizeObserverRef.current.unobserve(existing);
      }
      chartContainersRef.current[key] = node;
      if (!node) return;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.observe(node);
      } else {
        const rect = node.getBoundingClientRect();
        if (rect.width && rect.height) {
          updateCanvasSize(key, rect.width, rect.height);
        }
      }
    },
    [updateCanvasSize],
  );

  const drawCharts = useCallback(
    (dataset = dataRef.current) => {
      chartConfigs.forEach((config) => {
        const canvas = config.canvasRef.current;
        if (!canvas) return;
        const strokeColor = getCssVariable(
          canvas,
          config.strokeVar,
          config.fallbackColor,
        );
        const labelColor = getCssVariable(canvas, LABEL_COLOR_VAR, '#ffffff');
        drawChart(
          canvas,
          dataset[config.key] || [],
          strokeColor,
          config.legendLabel,
          config.unit,
          config.max,
          labelColor,
          chartSizes[config.key],
        );
      });
    },
    [chartConfigs, chartSizes],
  );

  useEffect(() => {
    drawCharts();
    displayRef.current = {
      cpu: [...dataRef.current.cpu],
      mem: [...dataRef.current.mem],
      fps: [...dataRef.current.fps],
      net: [...dataRef.current.net],
    };
  }, [drawCharts]);

  useEffect(() => {
    if (!prefersReducedMotion) return undefined;
    cancelAnimationFrame(animRef.current);
    drawCharts();
    displayRef.current = {
      cpu: [...dataRef.current.cpu],
      mem: [...dataRef.current.mem],
      fps: [...dataRef.current.fps],
      net: [...dataRef.current.net],
    };
    return undefined;
  }, [prefersReducedMotion, drawCharts]);

  const pushSample = useCallback((key, value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const arr = dataRef.current[key];
    const tsArr = timestampsRef.current[key];
    arr.push(safeValue);
    tsArr.push(new Date().toISOString());
    if (arr.length > MAX_POINTS) arr.shift();
    if (tsArr.length > MAX_POINTS) tsArr.shift();
    setLatestSamples((prev) => {
      const timestamp = tsArr[tsArr.length - 1];
      const current = prev[key];
      if (current && current.timestamp === timestamp && current.value === safeValue) {
        return prev;
      }
      return {
        ...prev,
        [key]: { value: safeValue, timestamp },
      };
    });
  }, []);

  const animateCharts = useCallback(() => {
    const target = {
      cpu: [...dataRef.current.cpu],
      mem: [...dataRef.current.mem],
      fps: [...dataRef.current.fps],
      net: [...dataRef.current.net],
    };
    if (prefersReducedMotion) {
      drawCharts(target);
      displayRef.current = target;
      return;
    }
    const from = {
      cpu: [...displayRef.current.cpu],
      mem: [...displayRef.current.mem],
      fps: [...displayRef.current.fps],
      net: [...displayRef.current.net],
    };
    const start = performance.now();
    const duration = 300;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const interpolated = {};
      Object.keys(target).forEach((key) => {
        const fromArr = from[key];
        const toArr = target[key];
        interpolated[key] = toArr.map((v, i) => {
          const base = fromArr[i] ?? fromArr[fromArr.length - 1] ?? v;
          return base + (v - base) * t;
        });
      });
      drawCharts(interpolated);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        displayRef.current = target;
      }
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
  }, [drawCharts, prefersReducedMotion]);

  const scheduleDraw = useCallback(() => {
    const now = performance.now();
    if (now - lastDrawRef.current >= THROTTLE_MS) {
      lastDrawRef.current = now;
      animateCharts();
    }
  }, [animateCharts]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return undefined;
    workerRef.current = new Worker(new URL('./speedtest.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { speed } = e.data || {};
      pushSample('net', speed);
      scheduleDraw();
    };
    workerRef.current.postMessage({ type: 'start' });
    return () => workerRef.current?.terminate();
  }, [pushSample, scheduleDraw]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: paused ? 'stop' : 'start' });
    }
  }, [paused]);

  useEffect(() => {
    let raf;
    let lastFrame = performance.now();
    let lastSample = performance.now();

    const sample = (now) => {
      const dt = now - lastFrame;
      lastFrame = now;
      const currentFps = 1000 / dt;
      if (!paused) setFps(currentFps);

      if (!paused && now - lastSample >= 1000) {
        const target = 1000 / 60;
        const cpu = Math.min(100, Math.max(0, ((dt - target) / target) * 100));
        let mem = 0;
        if (performance && performance.memory) {
          const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
          mem = (usedJSHeapSize / totalJSHeapSize) * 100;
        }
        pushSample('cpu', cpu);
        pushSample('mem', mem);
        pushSample('fps', currentFps);
        scheduleDraw();
        lastSample = now;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [paused, pushSample, scheduleDraw]);

  useEffect(() => {
    let raf;
    const animate = () => {
      if (prefersReducedMotion) return;
      if (stress && !paused) {
        const rect = containerRef.current?.getBoundingClientRect();
        stressWindows.current.forEach((w, i) => {
          w.x += w.vx;
          w.y += w.vy;
          if (rect) {
            if (w.x < 0 || w.x > rect.width - 20) w.vx *= -1;
            if (w.y < 0 || w.y > rect.height - 20) w.vy *= -1;
          }
          const el = stressEls.current[i];
          if (el) el.style.transform = `translate(${w.x}px, ${w.y}px)`;
        });
      }
      raf = requestAnimationFrame(animate);
    };
    if (!prefersReducedMotion) {
      raf = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(raf);
  }, [stress, paused, prefersReducedMotion]);

  useEffect(() => {
    if (stress) {
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 300;
      const height = rect?.height || 200;
      stressWindows.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
      }));
    } else {
      stressWindows.current = [];
      stressEls.current = [];
    }
  }, [stress]);

  const formatTooltip = useCallback(
    (config) => {
      const sample = latestSamples[config.key];
      if (!sample) {
        return `${config.tooltipLabel} samples not yet available`;
      }
      const timestamp = new Date(sample.timestamp);
      const formatted = Number.isNaN(timestamp.valueOf())
        ? sample.timestamp
        : timestamp.toLocaleString();
      const suffix = formatUnitSuffix(config.unit);
      return `${config.tooltipLabel}: ${sample.value.toFixed(1)}${suffix} sampled at ${formatted}`;
    },
    [latestSamples],
  );

  const togglePause = () => setPaused((p) => !p);
  const toggleStress = () => setStress((s) => !s);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu overflow-hidden"
    >
      <div className="p-2 flex gap-2 items-center">
        <button onClick={togglePause} className="px-2 py-1 bg-ub-dark-grey rounded">
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={toggleStress} className="px-2 py-1 bg-ub-dark-grey rounded">
          {stress ? 'Stop Stress' : 'Stress Test'}
        </button>
        <span className="ml-auto text-sm">FPS: {fps.toFixed(1)}</span>
      </div>
      <div className="grid flex-1 gap-4 p-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 auto-rows-fr">
        {chartConfigs.map((config) => {
          const tooltip = formatTooltip(config);
          const ariaDescription = `${config.ariaLabel}. ${tooltip}`;
          const size = chartSizes[config.key];
          return (
            <div
              key={config.key}
              ref={registerContainer(config.key)}
              data-chart-key={config.key}
              data-testid={`resource-chart-${config.key}`}
              className="relative w-full h-32 sm:h-36 xl:h-40 bg-ub-dark-grey rounded overflow-hidden"
              title={tooltip}
            >
              <canvas
                ref={config.canvasRef}
                width={size.width}
                height={size.height}
                role="img"
                aria-label={ariaDescription}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          );
        })}
      </div>
      {stressWindows.current.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            stressEls.current[i] = el;
          }}
          className="absolute w-8 h-6 bg-white bg-opacity-20 border border-gray-500 pointer-events-none"
        />
      ))}
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
