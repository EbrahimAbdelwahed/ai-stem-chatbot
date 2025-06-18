'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { visualizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  createStreamableUI,
  createStreamableValue,
  getMutableAIState,
  render,
  streamUI,
  AI as ImportedAI, // Alias the imported AI to avoid conflict
  createAI, // Attempt to import createAI
} from 'ai/rsc';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { v4 as uuidv4 } from 'uuid';

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
  // Initialize streamables and AI state at the beginning
  const uiStream = createStreamableUI();
  const textStream = createStreamableValue(); // textStream is initialized but not directly returned if auth fails early.
  const aiState = getMutableAIState<typeof AI>();

  const session = await auth();
  if (!session?.user?.id) {
    // Get current AI state for updating, even if it's empty
    const currentMessages = aiState.get();
    aiState.done([
      ...currentMessages,
      { role: 'assistant', content: 'Error: User not authenticated.' },
    ]);
    uiStream.done(<div>Error: User not authenticated. Please log in.</div>);
    return {
      id: Date.now().toString(),
      display: uiStream.value,
    };
  }
  const userId = session.user.id;

  const message = formData.get('message') as string;
  if (!message || typeof message !== 'string') {
    // Handle error: message is not found or not a string
    // For now, let's assume we might throw an error or return an error state
    // This part needs further refinement based on how errors are handled in the app
    uiStream.done(<div>Error: Message is invalid.</div>);
    return {
      id: Date.now().toString(),
      display: uiStream.value,
    };
  }

  // Update AI state with user message
  aiState.update([
    ...aiState.get(),
    {
      role: 'user',
      content: message,
    },
  ]);

  // Append user message to UI stream
  uiStream.append(<div>User: {message}</div>); // Placeholder for actual user message component

  const result = await streamUI({
    model: myProvider.languageModel('chat-model'), // Assuming 'chat-model' is the correct model alias
    initial: uiStream.value, // Pass the current UI stream
    system:
      'You are a helpful AI assistant specializing in creating scientific and data visualizations. You have access to tools for creating plots and viewing molecules. When asked to refine a visualization, use your tools to do so.',
    messages: aiState.get(),
    text: textStream, // Stream text responses
    tools: {
      createPlotlyChart: {
        description: 'Creates a Plotly chart from given data and title.',
        parameters: z.object({
          title: z.string().describe('The title of the chart.'),
          data: z.object({}).passthrough().describe('The data for the chart, should be a valid Plotly data structure.'),
        }),
        render: async function* ({ title, data }) {
          uiStream.append(<div>Generating plot: {title}...</div>); // Placeholder for loading component

          try {
            if (visualizationId) {
              // Update existing visualization
              const updated = await db
                .update(visualizations)
                .set({ data, title, updatedAt: new Date() })
                .where(eq(visualizations.id, visualizationId))
                .returning({ updatedId: visualizations.id });

              if (updated.length === 0) {
                // This case should ideally be handled, maybe the ID was invalid
                uiStream.append(<div>Error: Could not find visualization to update.</div>);
                aiState.done([
                  ...aiState.get(),
                  { role: 'assistant', name: 'createPlotlyChart', content: `Failed to update plot: ${title}. Visualization ID ${visualizationId} not found.` },
                ]);
                return <div>Error updating plot.</div>; // Placeholder
              }
              const updatedVizId = updated[0].updatedId;
              // TODO: Replace with actual component rendering the updated plot
              uiStream.append(<div>Plot "{title}" (ID: {updatedVizId}) updated.</div>);
              aiState.done([
                ...aiState.get(),
                { role: 'assistant', name: 'createPlotlyChart', content: `Updated plot: ${title}` },
              ]);
              return <div>Plot "{title}" updated.</div>; // Placeholder for actual component
            } else {
              // Create new visualization
              // Create new visualization
              let chatId = '';
              const existingMessages = aiState.get();
              // A simple check for chatId on the AI state object itself, if it were structured that way.
              // More likely, it would be on individual messages if present, or needs to be generated.
              // For this implementation, we'll generate a new one if not in visualizationId mode.
              // A more robust solution might involve passing chatId explicitly or retrieving from a dedicated chat context.
              if (existingMessages.length > 0 && (existingMessages[0] as any).chatId) {
                 chatId = (existingMessages[0]as any).chatId; // Example, assuming chatId might be on first message
              } else {
                chatId = uuidv4();
              }
              // If aiState itself has a chatId property (e.g. aiState.get().chatId) use it, otherwise generate.
              // This depends on the structure of `AI` type which is not fully visible.
              // const chatId = (aiState.get() as any).chatId || uuidv4();


              const newViz = await db
                .insert(visualizations)
                .values({
                  userId: userId, // Actual user ID
                  chatId: chatId, // Generated or retrieved chat ID
                  type: 'plot',
                  title,
                  data,
                })
                .returning({ newId: visualizations.id });

              const newVizId = newViz[0].newId;
              aiState.done([
                ...aiState.get(),
                { role: 'assistant', name: 'createPlotlyChart', content: `Created plot: ${title}` },
              ]);
              // Redirect to the new visualization's page
              // Note: redirect needs to be handled carefully with streaming UI.
              // Usually, redirect is called outside the stream render.
              // For now, we'll append a message and the actual redirect might need to happen client-side or after stream completion.
              uiStream.append(<div>Plot "{title}" (ID: {newVizId}) created. You will be redirected.</div>);
              redirect(`/playground?id=${newVizId}`); // This might interrupt the stream if not handled carefully
              return <div>Plot "{title}" created.</div>; // Placeholder for actual component
            }
          } catch (error) {
            console.error('Error in createPlotlyChart tool:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            uiStream.append(<div>Error generating plot: {errorMessage}</div>);
            aiState.done([
              ...aiState.get(),
              { role: 'assistant', name: 'createPlotlyChart', content: `Error creating/updating plot: ${title}. Details: ${errorMessage}` },
            ]);
            return <div>Error in plot generation.</div>; // Placeholder
          }
        },
      },
      showMoleculeStructure: {
        description: 'Displays a molecule structure using a molecular viewer.',
        parameters: z.object({
          title: z.string().describe('The title or name of the molecule.'),
          data: z.object({}).passthrough().describe('The data for the molecule, e.g., PDB ID or chemical structure.'),
        }),
        render: async function* ({ title, data }) {
          uiStream.append(<div>Loading molecule: {title}...</div>); // Placeholder for loading component
          try {
            if (visualizationId) {
              const updated = await db
                .update(visualizations)
                .set({ data, title, updatedAt: new Date() })
                .where(eq(visualizations.id, visualizationId))
                .returning({ updatedId: visualizations.id });

              if (updated.length === 0) {
                uiStream.append(<div>Error: Could not find visualization to update.</div>);
                aiState.done([
                  ...aiState.get(),
                  { role: 'assistant', name: 'showMoleculeStructure', content: `Failed to update molecule: ${title}. Visualization ID ${visualizationId} not found.` },
                ]);
                return <div>Error updating molecule.</div>;
              }
              const updatedVizId = updated[0].updatedId;
              uiStream.append(<div>Molecule "{title}" (ID: {updatedVizId}) updated.</div>); // Placeholder
              aiState.done([
                ...aiState.get(),
                { role: 'assistant', name: 'showMoleculeStructure', content: `Updated molecule: ${title}` },
              ]);
              return <div>Molecule "{title}" updated.</div>; // Placeholder for actual component
            } else {
              let chatId = '';
              const existingMessages = aiState.get();
              if (existingMessages.length > 0 && (existingMessages[0] as any).chatId) {
                 chatId = (existingMessages[0]as any).chatId;
              } else {
                chatId = uuidv4();
              }
              // const chatId = (aiState.get() as any).chatId || uuidv4();

              const newViz = await db
                .insert(visualizations)
                .values({
                  userId: userId,
                  chatId: chatId,
                  type: 'molecule',
                  title,
                  data,
                })
                .returning({ newId: visualizations.id });
              const newVizId = newViz[0].newId;
              aiState.done([
                ...aiState.get(),
                { role: 'assistant', name: 'showMoleculeStructure', content: `Showing molecule: ${title}` },
              ]);
              uiStream.append(<div>Molecule "{title}" (ID: {newVizId}) created. You will be redirected.</div>);
              redirect(`/playground?id=${newVizId}`);
              return <div>Molecule "{title}" created.</div>; // Placeholder
            }
          } catch (error) {
            console.error('Error in showMoleculeStructure tool:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            uiStream.append(<div>Error loading molecule: {errorMessage}</div>);
            aiState.done([
              ...aiState.get(),
              { role: 'assistant', name: 'showMoleculeStructure', content: `Error showing/updating molecule: ${title}. Details: ${errorMessage}` },
            ]);
            return <div>Error in molecule display.</div>;
          }
        },
      },
    },
  });

  return {
    id: Date.now().toString(),
    display: result.value, // uiStream.value will be managed by streamUI
    // text: textStream.value, // textStream is passed to streamUI, so it's also managed
  };
}

// Define and export the AI object configured with actions
export const AI = createAI({
  actions: {
    continuePlaygroundConversation,
    // IMPORTANT: Add other server actions intended for AI.useAction here
    // For example: saveChatModelAsCookie, generateTitleFromUserMessage, etc.
    // For now, only adding continuePlaygroundConversation as per subtask focus.
    // Consider if all exported functions should be actions or only specific ones.
    saveChatModelAsCookie,
    generateTitleFromUserMessage,
    deleteTrailingMessages,
    updateChatVisibility,
  },
  // initialAIState and initialUIState would typically be defined here as well.
  // Leaving them out as they are not part of this subtask's scope.
  // initialAIState: [],
  // initialUIState: [],
});
