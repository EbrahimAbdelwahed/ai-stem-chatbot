import { tool } from 'ai';
import { z } from 'zod';

export const createPlotlyChart = tool({
  description:
    'Render an interactive Plotly.js figure. The `figure` can include `data`, `layout` and optional `frames` to create animations.  \n\nAnimation guidance: when you supply a non-empty `frames` array, also include suitable `layout.updatemenus` or `layout.sliders` so that Plotly can expose play / pause controls (see https://plotly.com/python/animations/).  The client automatically calls `Plotly.animate` after first render so the animation starts playing without user interaction.',
  parameters: z.object({
    figure: z.any().describe('Plotly figure JSON'),
    title: z.string().optional().describe('Optional title'),
  }),
  // For streamText usage, we simply return the payload; client renders via tool invocation
  execute: async (args) => {
    return args as any;
  },
}); 