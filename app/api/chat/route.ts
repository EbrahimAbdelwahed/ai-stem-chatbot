import { streamUI } from 'ai/rsc';
import { createConversation, saveMessage } from '@/lib/db/conversations';
import { auth } from '@/app/(auth)/auth';
import { getModelConfig } from '@/lib/ai/lazy-models';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { 
  displayMolecule3D, 
  plotFunction2D, 
  plotFunction3D, 
  displayPlotlyChart, 
  displayPhysicsSimulation, 
  performOCR 
} from '@/lib/ai/tools/visualization-tools';
import React from 'react';
import { createDataStreamResponse } from 'ai';

// Import visualization components
import PlotlyPlotter from '@/components/visualizations/PlotlyPlotter';
import Simple3DMolViewer from '@/components/visualizations/Simple3DMolViewer';
import Advanced3DMolViewer from '@/components/visualizations/Advanced3DMolViewer';
import MatterSimulator from '@/components/visualizations/MatterSimulator';
import OCRResult from '@/components/OCRResult';
import Weather from '@/components/weather';

export const maxDuration = 60;

// Helper function to render visualization components based on tool results
function renderVisualizationComponent(toolName: string, result: any) {
  switch (result.type) {
    case 'molecule3d':
      // Check if advanced options are used
      const hasAdvancedOptions = result.representationStyle !== 'stick' ||
        result.colorScheme !== 'element' ||
        (result.selections && result.selections.length > 0) ||
        result.showSurface ||
        result.showLabels ||
        result.backgroundColor !== 'white';

      if (hasAdvancedOptions) {
        return React.createElement(Advanced3DMolViewer, result);
      } else {
        return React.createElement(Simple3DMolViewer, result);
      }

    case 'plot2d':
    case 'plot3d':
    case 'plotly':
      return React.createElement(PlotlyPlotter, { 
        params: result, 
        description: result.description 
      });

    case 'physics':
      return React.createElement(MatterSimulator, result);

    case 'ocr':
      return React.createElement(OCRResult, result);

    default:
      return React.createElement('div', { 
        className: 'p-4 text-gray-600 bg-gray-100 border border-gray-300 rounded-md' 
      }, `Tool result: ${JSON.stringify(result, null, 2)}`);
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  // Support both a single `message` field (from incremental calls) and a full `messages` array
  const incomingMessages = body.messages ?? (body.message ? [body.message] : undefined);
  const modelId = body.modelId ?? body.model ?? body.selectedChatModel;
  const currentConversationId = body.conversationId ?? body.id;

  const messages = incomingMessages as any;

  // -------------------------------------------------------------------
  // Input validation – streamUI requires a non-empty `messages` array
  // -------------------------------------------------------------------
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request – `messages` array must be provided and contain at least one message.'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const session = await auth();

  let conversationId: string | undefined = currentConversationId;

  if (!conversationId && session?.user?.id) {
    const convo = await createConversation({
      userId: session.user.id,
      title: messages[0]?.content ?? 'New Conversation',
      model: modelId,
    });
    conversationId = convo.id;
    console.log('[api/chat] Created new conversation:', conversationId);
  }

  const { model, system } = await getModelConfig(modelId);

  console.log('[api/chat] Using conversation ID:', conversationId);

  const result = await streamUI({
    model,
    system,
    messages,
    tools: {
      // Existing tools
      getWeather: {
        description: getWeather.description,
        parameters: getWeather.parameters,
        generate: async (args) => {
          const weatherData = await getWeather.execute(args);
          return React.createElement(Weather, { weatherAtLocation: weatherData });
        },
      },
      createDocument: {
        description: createDocument.description,
        parameters: createDocument.parameters,
        generate: async (args) => {
          const result = await createDocument.execute(args);
          return React.createElement('div', { 
            className: 'p-4 text-green-600 bg-green-100 border border-green-300 rounded-md' 
          }, `Document created: ${result.title}`);
        },
      },
      updateDocument: {
        description: updateDocument.description,
        parameters: updateDocument.parameters,
        generate: async (args) => {
          const result = await updateDocument.execute(args);
          return React.createElement('div', { 
            className: 'p-4 text-blue-600 bg-blue-100 border border-blue-300 rounded-md' 
          }, `Document updated: ${result.title}`);
        },
      },
      requestSuggestions: {
        description: requestSuggestions.description,
        parameters: requestSuggestions.parameters,
        generate: async (args) => {
          const result = await requestSuggestions.execute(args);
          return React.createElement('div', { 
            className: 'p-4 text-purple-600 bg-purple-100 border border-purple-300 rounded-md' 
          }, `Suggestions: ${JSON.stringify(result, null, 2)}`);
        },
      },

      // Visualization tools
      displayMolecule3D: {
        description: displayMolecule3D.description,
        parameters: displayMolecule3D.parameters,
        generate: async (args) => {
          const result = await displayMolecule3D.execute(args);
          return renderVisualizationComponent('displayMolecule3D', result);
        },
      },
      plotFunction2D: {
        description: plotFunction2D.description,
        parameters: plotFunction2D.parameters,
        generate: async (args) => {
          const result = await plotFunction2D.execute(args);
          return renderVisualizationComponent('plotFunction2D', result);
        },
      },
      plotFunction3D: {
        description: plotFunction3D.description,
        parameters: plotFunction3D.parameters,
        generate: async (args) => {
          const result = await plotFunction3D.execute(args);
          return renderVisualizationComponent('plotFunction3D', result);
        },
      },
      displayPlotlyChart: {
        description: displayPlotlyChart.description,
        parameters: displayPlotlyChart.parameters,
        generate: async (args) => {
          const result = await displayPlotlyChart.execute(args);
          return renderVisualizationComponent('displayPlotlyChart', result);
        },
      },
      displayPhysicsSimulation: {
        description: displayPhysicsSimulation.description,
        parameters: displayPhysicsSimulation.parameters,
        generate: async (args) => {
          const result = await displayPhysicsSimulation.execute(args);
          return renderVisualizationComponent('displayPhysicsSimulation', result);
        },
      },
      performOCR: {
        description: performOCR.description,
        parameters: performOCR.parameters,
        generate: async (args) => {
          const result = await performOCR.execute(args);
          return renderVisualizationComponent('performOCR', result);
        },
      },
    },
    text: ({ content, done }) => {
      // Handle text streaming - return the content as a simple text node
      return content;
    },
    onFinish: async ({ usage, value }) => {
      try {
        const userMessage = messages[messages.length - 1];

        if (conversationId) {
          const convId = conversationId;
          console.log('[api/chat] Saving messages for conversation:', convId);

          // Persist last user message
          await saveMessage({
            conversationId: convId,
            role: userMessage.role || 'user',
            content: typeof userMessage.content === 'string' ? userMessage.content : JSON.stringify(userMessage.content),
            parts: Array.isArray(userMessage.content) ? userMessage.content : undefined,
          });
          console.log('[api/chat] Saved user message');

          // Persist assistant response - extract text from the React component value
          const assistantContent = typeof value === 'string' ? value : 'Generated UI component';
          await saveMessage({
            conversationId: convId,
            role: 'assistant',
            content: assistantContent,
          });
          console.log('[api/chat] Saved assistant message');
        } else {
          console.log('[api/chat] No conversation ID available, skipping message persistence');
        }
      } catch (err) {
        console.error('[api/chat] Error persisting messages:', err);
        console.error('[api/chat] Conversation ID was:', conversationId);
      }
    },
  });

  // Convert the streamUI result into a proper data-streaming HTTP Response that
  // the `useChat` hook understands. This restores the token-by-token streaming
  // behaviour that was lost when we returned only `result.value`.
  return createDataStreamResponse({
    async execute(dataStream) {
      // Forward all stream parts (text deltas, tool calls, etc.) produced by
      // streamUI to the client.
      dataStream.merge(result.stream);
    },
    // Surface useful headers for the client/UI (conversation tracking, etc.)
    headers: conversationId ? { 'X-Conversation-Id': conversationId } : undefined,
  });
} 