'use server';

import { type UIMessage } from 'ai';
import { generateText, streamUI, createAI, getMutableAIState } from 'ai/rsc';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { auth } from '@/app/(auth)/auth';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import { db } from '@/lib/db';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import { visualizations } from '@/lib/db/schema';

// This function can remain as is.
export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

// This function can remain as is.
export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

// This function can remain as is.
export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

// This function can remain as is.
export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

// The resolved version of the playground conversation action.
export async function continuePlaygroundConversation(
  formData: FormData,
  visualizationId?: string,
) {
  const aiState = getMutableAIState<typeof AI>();
  const session = await auth();

  if (!session?.user?.id) {
    // This is a critical error, we can't proceed.
    // In a real app, you might return an error message to the UI.
    throw new Error('User not authenticated.');
  }
  const userId = session.user.id;

  const userInput = formData.get('input') as string;
  if (!userInput) {
    // Handle empty input
    return;
  }
  
  const userMessage = { role: 'user', content: userInput };
  
  const result = await streamUI({
    model: myProvider.languageModel('chat-model'),
    system:
      'You are a helpful AI assistant specializing in creating scientific and data visualizations. You have access to tools for creating plots and viewing molecules. When asked to refine a visualization, use your tools to do so.',
    messages: [...aiState.get().messages, userMessage],
    tools: {
      createPlotlyChart: {
        description: 'Creates a Plotly chart from given data and title.',
        parameters: z.object({
          title: z.string().describe('The title of the chart.'),
          data: z.object({}).passthrough().describe('The data for the chart, should be a valid Plotly data structure.'),
        }),
        render: async function* (props) {
          yield <div>Generating plot: {props.title}...</div>;

          try {
            if (visualizationId) {
              await db
                .update(visualizations)
                .set({ data: props.data, title: props.title })
                .where(eq(visualizations.id, visualizationId));
              return <div>Plot "{props.title}" updated successfully.</div>;
            } else {
              const newViz = await db
                .insert(visualizations)
                .values({
                  id: uuidv4(),
                  userId,
                  chatId: uuidv4(), // Playground chats are self-contained for now.
                  type: 'plot',
                  title: props.title,
                  data: props.data,
                })
                .returning({ newId: visualizations.id });

              const newVizId = newViz[0].newId;
              redirect(`/playground?id=${newVizId}`);
              // Note: The redirect will interrupt this render flow for the client.
            }
          } catch (error) {
            console.error('Error in createPlotlyChart tool:', error);
            return <div>Error saving plot. Please try again.</div>;
          }
        },
      },
      showMoleculeStructure: {
        description: 'Displays a molecule structure using a molecular viewer.',
        parameters: z.object({
          title: z.string().describe('The title or name of the molecule.'),
          data: z.object({}).passthrough().describe('The data for the molecule, e.g., PDB ID or chemical structure.'),
        }),
        render: async function* (props) {
          yield <div>Loading molecule: {props.title}...</div>;
          try {
            if (visualizationId) {
              await db
                .update(visualizations)
                .set({ data: props.data, title: props.title })
                .where(eq(visualizations.id, visualizationId));
              return <div>Molecule "{props.title}" updated successfully.</div>;
            } else {
              const newViz = await db
                .insert(visualizations)
                .values({
                  id: uuidv4(),
                  userId,
                  chatId: uuidv4(), // Playground chats are self-contained for now.
                  type: 'molecule',
                  title: props.title,
                  data: props.data,
                })
                .returning({ newId: visualizations.id });
              
              const newVizId = newViz[0].newId;
              redirect(`/playground?id=${newVizId}`);
            }
          } catch (error) {
            console.error('Error in showMoleculeStructure tool:', error);
            return <div>Error saving molecule. Please try again.</div>;
          }
        },
      },
    },
  });

  return result.value;
}


export const AI = createAI({
  actions: {
    continuePlaygroundConversation,
    saveChatModelAsCookie,
    generateTitleFromUserMessage,
    deleteTrailingMessages,
    updateChatVisibility,
  },
  initialAIState: { messages: [] },
  initialUIState: [],
});