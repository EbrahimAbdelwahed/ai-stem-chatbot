import { tool } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { db } from '@/lib/db';
import { visualizations } from '@/lib/db/schema';
import type { CoreMessage } from 'ai';
import { auth } from '@/app/(auth)/auth';
import { generateText } from 'ai';

export const createPlotlyChart = tool({
  description:
    'Render an interactive Plotly.js figure. The `figure` can include `data`, `layout` and optional `frames` to create animations.  \n\nAnimation guidance: when you supply a non-empty `frames` array, also include suitable `layout.updatemenus` or `layout.sliders` so that Plotly can expose play / pause controls (see https://plotly.com/python/animations/).  The client automatically calls `Plotly.animate` after first render so the animation starts playing without user interaction.',
  parameters: z.object({
    figure: z.any().describe('Plotly figure JSON'),
    title: z.string().optional().describe('Optional title'),
  }),
  execute: async (
    args: { figure: any; title?: string },
    context: { chatId: string; messages: CoreMessage[] },
  ) => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      const summaryPrompt = context.messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const { text: summary } = await generateText({
        model: myProvider.languageModel('artifact-model'),
        prompt: summaryPrompt,
        system:
          'Summarize the following conversation in one sentence. This summary will be used as a description for a generated chart. The user has just asked to create this chart.',
      });

      const newVisualization = await db
        .insert(visualizations)
        .values({
          userId: session.user.id,
          chatId: context.chatId,
          type: 'plot',
          title: args.title || 'Untitled Chart',
          description: summary,
          data: { figure: args.figure },
        })
        .returning({ insertedId: visualizations.id });

      if (!newVisualization || newVisualization.length === 0 || !newVisualization[0].insertedId) {
        throw new Error('Failed to save visualization to database');
      }

      return {
        figure: args.figure,
        title: args.title,
        visualizationId: newVisualization[0].insertedId,
      };
    } catch (error) {
      console.error('Error creating Plotly chart:', error);
      // Re-throw the error or return an error structure as appropriate
      // For now, let's re-throw, but you might want to return a structured error
      // that the AI can understand and potentially relay to the user.
      throw error;
    }
  },
}); 