'use client';

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export interface TimelineEntry {
  timestamp: string;
  event: string;
  thumbnail?: string;
}

interface TimelineProps {
  events: TimelineEntry[];
}

const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const focusRef = useRef<SVGSVGElement>(null);
  const contextRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const parsed = events.map((d) => ({ ...d, date: new Date(d.timestamp) }));

    const margin = { top: 10, right: 10, bottom: 20, left: 10 };
    const margin2 = { top: 10, right: 10, bottom: 20, left: 10 };
    const width = focusRef.current?.clientWidth || 600;
    const height = 60;
    const height2 = 40;

    const x = d3
      .scaleTime()
      .domain(d3.extent(parsed, (d) => d.date) as [Date, Date])
      .range([0, width - margin.left - margin.right]);
    const x2 = d3
      .scaleTime()
      .domain(x.domain())
      .range([0, width - margin2.left - margin2.right]);

    const focus = d3.select(focusRef.current);
    focus.selectAll('*').remove();
    const focusG = focus
      .attr('width', width)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    focusG
      .selectAll('circle')
      .data(parsed)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.date))
      .attr('cy', height / 2)
      .attr('r', 4)
      .attr('fill', '#3b82f6');

    const axisFocus = focusG
      .append('g')
      .attr('transform', `translate(0, ${height - 10})`)
      .call(d3.axisBottom(x).ticks(5));

    const context = d3.select(contextRef.current);
    context.selectAll('*').remove();
    const contextG = context
      .attr('width', width)
      .attr('height', height2 + margin2.top + margin2.bottom)
      .append('g')
      .attr('transform', `translate(${margin2.left},${margin2.top})`);

    contextG
      .append('g')
      .attr('transform', `translate(0, ${height2})`)
      .call(d3.axisBottom(x2).ticks(5));

    const brush = d3
      .brushX()
      .extent([ [0, 0], [width - margin2.left - margin2.right, height2] ])
      .on('brush end', (event) => {
        const selection = event.selection as [number, number] | null;
        if (!selection) return;
        const [x0, x1] = selection;
        const newDomain = [x2.invert(x0), x2.invert(x1)] as [Date, Date];
        x.domain(newDomain);
        focusG.selectAll('circle').attr('cx', (d) => x((d as any).date));
        axisFocus.call(d3.axisBottom(x).ticks(5));
      });

    contextG
      .append('g')
      .attr('class', 'brush')
      .call(brush)
      .call(brush.move, x.range() as [number, number]);
  }, [events]);

  return (
    <div>
      <svg ref={focusRef} className="w-full" aria-label="Timeline" />
      <svg ref={contextRef} className="w-full mt-2" aria-label="Timeline overview" />
    </div>
  );
};

export default Timeline;

