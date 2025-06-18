import { PlaygroundChat } from './playground-chat'; // Adjust path if necessary
import { getChatMessages } from '@/lib/db/queries'; // Adjust path if necessary
import type { CoreMessage } from 'ai'; // Assuming CoreMessage is the target type

// Mock function for fetching visualization data - replace with actual implementation later
async function getVisualization(id: string): Promise<{ chatId: string; title: string } | null> {
  console.log(`Fetching visualization data for ID: ${id}`);
  // Simulate fetching data
  if (id === 'existing-viz-123') {
    return { chatId: 'chat-abc-123', title: 'Existing Visualization' };
  }
  return null;
}

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
    const visualization = await getVisualization(visualizationId);
    if (visualization && visualization.chatId) {
      chatTitle = visualization.title || `Chat for ${visualizationId}`;
      try {
        const dbMessages = await getChatMessages({ chatId: visualization.chatId });
        // Basic transformation: DBMessage to CoreMessage
        // This assumes DBMessage has id, role, content, and createdAt.
        // Adjust based on actual DBMessage structure and CoreMessage requirements.
        initialMessages = dbMessages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool', // Cast role
          content: msg.content || '', // Ensure content is not null
          // Add other CoreMessage fields if necessary, e.g., from msg.attachments or msg.data
        }));
      } catch (error) {
        console.error(`Failed to get chat messages for ${visualization.chatId}:`, error);
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
  );
}
