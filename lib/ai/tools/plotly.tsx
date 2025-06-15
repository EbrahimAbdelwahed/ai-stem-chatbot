import { z } from 'zod';
import React from 'react';

import Spinner from '@/components/ui/Spinner';
import { PlotlyChart } from '@/components/visualizations/PlotlyChart';

/**
 * Tool: createPlotlyChart
 * Lets the model create a fully-featured, interactive Plotly chart.
 */
export const createPlotlyChart = {
  description:
    'Create an interactive Plotly.js chart. Accepts a full Plotly figure JSON (data, layout, frames).',
  parameters: z.object({
    figure: z.any().describe('A valid Plotly figure JSON as defined by Plotly.js'),
    title: z.string().optional().describe('Optional title to render above the chart'),
  }),
  // Generator so we can show a loading placeholder while the bundle loads on the client
  generate: async function* ({ figure, title }: { figure: any; title?: string }) {
    yield <Spinner />;
    return <PlotlyChart figure={figure} title={title} />;
  },
};

export const plotlyTools = {
  createPlotlyChart,
}; 