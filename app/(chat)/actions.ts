'use server';

import { generateText, type UIMessage } from 'ai';
import { createAI, streamUI } from 'ai/rsc';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  // Assuming these exist or will be created in this path:
  // updateVisualizationById,
  // insertVisualization,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function continuePlaygroundConversation(
  formData: FormData,
  visualizationId?: string,
) {
  // TODO: Get user input from formData
  const userInput = formData.get('input') as string;

  // TODO: Create a message object
  const userMessage: UIMessage = {
    id: nanoid(),
    role: 'user',
    content: userInput,
  };

  const messages = [userMessage];

  // TODO: Call streamUI
  const result = await streamUI({
    model: myProvider.languageModel('chat-model'),
    system:
      'You are an expert visualization assistant. You will create or refine plots and molecule visualizations based on user requests.',
    messages,
    tools: {
      createPlotlyChart: {
        description: 'Create a new Plotly chart or update an existing one.',
        parameters: z.object({
          title: z.string().describe('The title of the chart.'),
          data: z.object({}).passthrough().describe('The Plotly data object.'),
        }),
        render: async function* ({ title, data }) {
          if (visualizationId) {
            console.log('Updating Plotly chart with ID:', visualizationId);
            // Placeholder: await updateVisualizationById({ id: visualizationId, title, data, type: 'plotly' });
            yield <div>Plotly chart updated: {title}</div>;
          } else {
            console.log('Creating new Plotly chart with title:', title);
            // Placeholder: const newVisualization = await insertVisualization({ title, data, type: 'plotly' });
            // Placeholder: const newId = newVisualization.id;
            const newId = 'temp_new_plotly_id'; // Using placeholder ID
            redirect(`/playground?id=${newId}`);
            // Important: The redirect call above will interrupt rendering here for the client,
            // but the generator still needs to yield a final result for the stream.
            yield <div>Plotly chart created: {title}. Redirecting...</div>;
          }
        },
      },
      showMoleculeStructure: {
        description: 'Display a molecule structure or update an existing one.',
        parameters: z.object({
          title: z.string().describe('The title of the molecule view.'),
          data: z
            .object({})
            .passthrough()
            .describe(
              'The data object for the molecule, e.g., SMILES string or other format.',
            ),
        }),
        render: async function* ({ title, data }) {
          if (visualizationId) {
            console.log(
              'Updating molecule structure with ID:',
              visualizationId,
            );
            // Placeholder: await updateVisualizationById({ id: visualizationId, title, data, type: 'molecule' });
            yield <div>Molecule structure updated: {title}</div>;
          } else {
            console.log('Creating new molecule structure with title:', title);
            // Placeholder: const newVisualization = await insertVisualization({ title, data, type: 'molecule' });
            // Placeholder: const newId = newVisualization.id;
            const newId = 'temp_new_molecule_id'; // Using placeholder ID
            redirect(`/playground?id=${newId}`);
            yield (
              <div>Molecule structure created: {title}. Redirecting...</div>
            );
          }
        },
      },
    },
  });

  return result;
}

export const AI = createAI({
  actions: {
    continuePlaygroundConversation,
    // Other server actions can be added here if they need to be part of the AI context
  },
  initialAIState: undefined,
  initialUIState: undefined,
});
