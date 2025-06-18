
import { PlaygroundChat } from './playground-chat'; // Adjust path if necessary
import { getChatMessages } from '@/lib/db/queries'; // Adjust path if necessary
import type { CoreMessage } from 'ai'; // Assuming CoreMessage is the target type
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { visualizations, type DBMessage } from '@/lib/db/schema';

interface PlaygroundWorkspaceProps {
  isNew?: boolean;
  visualizationId?: string;
}

export default async function PlaygroundWorkspace({
  isNew = false,
  visualizationId,
}: PlaygroundWorkspaceProps) {
  let initialMessages: CoreMessage[] = [];
  let chatTitle = 'New Playground Chat'; // Default title

  if (visualizationId) {
    const visualization = await db.query.visualizations.findFirst({
      where: eq(visualizations.id, visualizationId),
    });

    if (visualization && visualization.chatId) {
      chatTitle = visualization.title || `Chat for ${visualizationId}`;
      try {
        // Corrected call to getChatMessages based on previous subtask
        const dbMessages: DBMessage[] = await getChatMessages(visualization.chatId);
        initialMessages = dbMessages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool',
          content: msg.content ?? '', // Use ?? for nullish coalescing, ensure content is not null
          // Ensure other CoreMessage fields are mapped if necessary
          // e.g., data: msg.metadata, experimental_attachments: msg.attachments
        }));
      } catch (error) {
        console.error(`Failed to get chat messages for chat ID ${visualization.chatId}:`, error);
        // Fallback to empty messages on error
        initialMessages = [];
      }
    } else {
      // If visualizationId is provided but not found, or it has no chatId
      console.warn(`Visualization with ID ${visualizationId} not found or has no chatId.`);
      initialMessages = [{
        id: 'error-viz-not-found',
        role: 'system',
        content: `Could not load chat history for visualization ID ${visualizationId}. Visualization not found or has no associated chat.`
      }];
    }
  } else if (isNew) {
    // isNew is true, start with an empty array (already default)
    chatTitle = 'New Playground Session';
  }

  // If initialMessages is still empty and it's not explicitly a new chat with a vizId that failed loading
  if (initialMessages.length === 0 && !(visualizationId && initialMessages[0]?.id === 'error-viz-not-found')) {
     initialMessages = [{
        id: 'welcome-message',
        role: 'assistant',
        content: 'Welcome to the Playground! How can I help you today?'
     }];
  }


  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="p-4 bg-white border-b">
        <h1 className="text-xl font-semibold">{chatTitle}</h1>
      </header>

      <div className="flex flex-row flex-grow overflow-hidden">
        {/* Left Panel (e.g., for visualization or editor) - Placeholder */}
        <aside className="w-1/2 p-4 bg-white border-r overflow-y-auto">
          <h2 className="text-lg font-medium mb-2">Visualization/Editor Panel</h2>
          <div className="bg-gray-50 h-full flex items-center justify-center rounded">
            <p className="text-gray-500">Content for the left panel (e.g., visualization) goes here.</p>
            {visualizationId && <p className="text-gray-400 text-sm mt-2">Visualization ID: {visualizationId}</p>}
          </div>
        </aside>

        {/* Right Panel (Chat) */}
        <main className="w-1/2 flex flex-col">
          <PlaygroundChat
            initialMessages={initialMessages}
            visualizationId={visualizationId}
          />
        </main>
      </div>
    </div>
=======
'use client';

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import PlotlyArtifact from '@/components/visualizations/plotly-artifact';
import MoleculeArtifact from '@/components/visualizations/molecule-artifact';
import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

// Define a fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PlaygroundWorkspaceProps {
  visualizationId?: string;
  isNew?: boolean;
}

// Define a simple type for the visualization data
// Adjust this based on the actual API response structure, especially for 'type'
interface VisualizationApiResponse {
  id: string;
  type: 'plotly' | 'molecule' | string; // Add other types if necessary
  title?: string;
  description?: string;
  // other fields like pdbId for molecule, data/layout for plotly will be in the full response
  // but PlotlyArtifact and MoleculeArtifact fetch these details themselves.
}

export default function PlaygroundWorkspace({ visualizationId, isNew }: PlaygroundWorkspaceProps) {
  const { data: vizDetails, error: vizDetailsError } = useSWR<VisualizationApiResponse>(
    visualizationId ? `/api/visualizations/${visualizationId}` : null, // Fetch only if visualizationId is present
    fetcher
  );

  const renderVisualization = () => {
    if (!visualizationId) return null; // Should not happen if isNew is false
    if (vizDetailsError) return <div className="p-4">Error loading visualization details.</div>;
    if (!vizDetails) return <Skeleton className="h-full w-full" />; // Full panel skeleton

    if (vizDetails.type === 'plotly') {
      return <PlotlyArtifact visualizationId={visualizationId} />;
    } else if (vizDetails.type === 'molecule') {
      return <MoleculeArtifact visualizationId={visualizationId} />;
    } else {
      return <div className="p-4">Unsupported visualization type: {vizDetails.type}</div>;
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={70}>
        <div className="flex h-full items-center justify-center p-6">
          {isNew ? (
            <p>Describe the visualization you want to create in the chat.</p>
          ) : visualizationId ? (
            renderVisualization()
          ) : (
            // Fallback, though ideally one of isNew or visualizationId is true
            <div className="p-4"><h1>Visualization Panel</h1></div>
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={30}>
        <div className="flex h-full items-center justify-center p-6">
          <h1>Chat Panel</h1>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
