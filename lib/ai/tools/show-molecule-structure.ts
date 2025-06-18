import { tool } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { db } from '@/lib/db';
import { visualizations } from '@/lib/db/schema';
import type { CoreMessage } from 'ai';
import { auth } from '@/app/(auth)/auth';
import { generateText } from 'ai';

/**
 * Tool: showMoleculeStructure
 *
 * Allows the model to render an interactive 3D molecular structure in the chat UI.
 * The client uses NGL Viewer to visualise the protein given its PDB identifier.
 *
 * Because we are using `streamText`, the execute function runs on the server but the
 * actual visualisation happens client-side once the result is streamed back.
 */
export const showMoleculeStructure = tool({
  description:
    'Render an interactive 3D molecular structure using NGL Viewer. Provide the PDB identifier (4-character code, e.g. "1cbs"). Optionally include a short `title` to display above the viewer.',
  parameters: z.object({
    pdbId: z
      .string()
      .min(4)
      .max(4)
      .describe('The 4-character PDB identifier of the molecule to display.'),
    title: z
      .string()
      .optional()
      .describe('Optional short title to render above the viewer.'),
  }),
  execute: async (args, context: { chatId: string; messages: CoreMessage[] }) => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      const summaryPrompt = context.messages
        .map((message) => `${message.role}: ${message.content}`)
        .join('\n');
      const { text: summary } = await generateText({
        model: myProvider.languageModel('artifact-model'),
        prompt: summaryPrompt,
        system:
          'Summarize the following conversation in one sentence. This summary will be used as a description for a generated molecule visualization. The user has just asked to view this molecule. Conversation:\n\n' +
          JSON.stringify(context.messages),
      });

      const newVisualization = await db
        .insert(visualizations)
        .values({
          userId: session.user.id,
          chatId: context.chatId,
          type: 'molecule',
          title: args.title || `Molecule: ${args.pdbId.toUpperCase()}`,
          description: summary,
          data: { pdbId: args.pdbId },
        })
        .returning({ insertedId: visualizations.id });

      if (!newVisualization || newVisualization.length === 0 || !newVisualization[0].insertedId) {
        throw new Error('Failed to create visualization in the database');
      }

      // Return an object compatible with the molecule3dArtifact
      return {
        type: 'molecule3d',
        identifierType: 'pdb',
        identifier: args.pdbId,
        title: args.title || `Molecule: ${args.pdbId.toUpperCase()}`,
        visualizationId: newVisualization[0].insertedId,
      };
    } catch (error) {
      console.error('Error executing showMoleculeStructure tool:', error);
      // Re-throwing the error or returning a specific error object might be necessary
      // depending on how errors are handled by the calling code.
      // For now, re-throw the original error.
      throw error;
    }
  },
}); 