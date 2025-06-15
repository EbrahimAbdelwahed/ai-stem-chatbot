"use client";

import dynamic from 'next/dynamic';
import { useRef, useEffect } from 'react';

// Dynamically import react-plotly.js (client-only)
// @ts-ignore – no types shipped for dist build
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as any;

type PlotlyHTMLElement = any;

export interface FigureJSON {
  data: any[];
  layout?: Record<string, any>;
  frames?: any[];
}

interface PlotlyChartProps {
  figure: FigureJSON;
  title?: string;
}

export function PlotlyChart({ figure, title }: PlotlyChartProps) {
  // In case tool call returns before figure is ready
  if (!figure) {
    return (
      <div className="p-4 text-muted-foreground text-sm italic">
        Waiting for chart data…
      </div>
    );
  }
  const ref = useRef<any>(null);

  // Ensure responsiveness
  useEffect(() => {
    function handleResize() {
      // plotly auto-resize
      if (ref.current && typeof window !== 'undefined') {
        // @ts-ignore – global Plotly
        window.Plotly?.Plots.resize(ref.current);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-play only after the initial plot is done
  useEffect(() => {
    if (!figure.frames?.length || typeof window === 'undefined') return;

    const el = ref.current;
    if (!el) return;

    function handleAfterPlot() {
      // @ts-ignore – global Plotly
      window.Plotly?.animate(
        el,
        null,
        {
          mode: 'immediate',
          transition: { duration: 300, easing: 'cubic-in-out' },
          frame: { duration: 500, redraw: false },
        },
      );
    }

    // run once
    // @ts-ignore – Plotly type
    el.once?.('plotly_afterplot', handleAfterPlot);

    return () => {
      // @ts-ignore
      el.removeListener?.('plotly_afterplot', handleAfterPlot);
    };
  }, [figure?.frames]);

  return (
    <div className="w-full overflow-x-auto">
      {title && <h3 className="text-center font-medium mb-2">{title}</h3>}
      <Plot
        ref={ref}
        data={figure.data}
        layout={{ responsive: true, ...(figure.layout || {}) }}
        frames={figure.frames}
        config={{ responsive: true, displaylogo: false }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
} 