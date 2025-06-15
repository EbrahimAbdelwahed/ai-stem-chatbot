import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool: showMoleculeStructure
 *
 * Allows the model to render an interactive 3D molecular structure in the chat UI.
 * The client uses Mol* (Molstar) to visualise the protein given its PDB identifier.
 *
 * Because we are using `streamText`, the execute function runs on the server but the
 * actual visualisation happens client-side once the result is streamed back. Hence
 * the execute merely echoes the validated arguments so the client can render.
 */
export const showMoleculeStructure = tool({
  description:
    'Render an interactive 3D molecular structure using Molstar. Provide the PDB identifier (4-character code, e.g. "1cbs"). Optionally include a short `title` to display above the viewer.',
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
  // For streamText usage we simply echo the args so the client can render.
  execute: async (args) => args as any,
}); 