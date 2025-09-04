'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import sample from '../sampleCapture.json';

type Network = {
  ssid: string;
  bssid: string;
  channel: number;
  signal: number;
};

type Cell = { time: number; channel: number; value: number };

const ChannelOccupancyHeatmap: React.FC = () => {
  const { data, channels, times, max } = useMemo(() => {
    const occ: Record<number, Record<number, number>> = {};
    (sample as Network[]).forEach((n, idx) => {
      const t = idx; // treat index as time step
      if (!occ[t]) occ[t] = {};
      occ[t][n.channel] = (occ[t][n.channel] || 0) + 1;
    });

    const times = Object.keys(occ)
      .map(Number)
      .sort((a, b) => a - b);
    const channelSet = new Set<number>();
    (sample as Network[]).forEach((n) => channelSet.add(n.channel));
    const channels = Array.from(channelSet).sort((a, b) => a - b);

    const data: Cell[] = [];
    times.forEach((t) =>
      channels.forEach((c) =>
        data.push({ time: t, channel: c, value: occ[t][c] || 0 }),
      ),
    );
    const max = d3.max(data, (d) => d.value) || 1;
    return { data, channels, times, max };
  }, []);

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const cellSize = 12;
    const width = times.length * cellSize;
    const height = channels.length * cellSize;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g');
    const x = d3.scaleLinear().domain([0, times.length]).range([0, width]);
    const y = d3.scaleBand<number>().domain(channels).range([0, height]);
    const color = d3
      .scaleSequential(d3.interpolateInferno)
      .domain([0, max]);

    g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.time))
      .attr('y', (d) => y(d.channel) || 0)
      .attr('width', x(1) - x(0))
      .attr('height', y.bandwidth())
      .attr('fill', (d) => color(d.value));

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .on('zoom', (event) => {
        const { transform } = event;
        g.attr('transform', `translate(${transform.x},0) scale(${transform.k},1)`);
      });
    svg.call(zoom as any);
  }, [data, channels, times, max]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-64 bg-gray-900 touch-pan-y"
      aria-label="Channel occupancy heatmap"
    />
  );
};

export default ChannelOccupancyHeatmap;

