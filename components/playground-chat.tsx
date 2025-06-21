'use client';

import { type CoreMessage } from 'ai';
import { useUIState, useActions } from 'ai/rsc';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { useState } from 'react'; // For temporary input handling

// Define the props for the component
interface PlaygroundChatProps {
  initialMessages: CoreMessage[];
  visualizationId?: string;
}

export function PlaygroundChat({
  initialMessages,
  visualizationId,
}: PlaygroundChatProps) {
  const [conversation, setConversation] = useUIState({ initialUI: initialMessages });
  const { continuePlaygroundConversation } = useActions<typeof import('@/app/(playground)/actions')>();

  // Temporary state for input since MultimodalInput might expect it or similar props
  const [input, setInput] = useState('');

  const handleSubmit = async (formData: FormData) => {
    const userMessage = formData.get('input') as string; // Assuming input field is named 'input'

    if (!userMessage) return; // Do not submit if input is empty

    // Optimistically update UI
    setConversation((prevConversation: CoreMessage[]) => [
      ...prevConversation,
      {
        id: Date.now().toString(), // Temporary ID
        role: 'user',
        content: userMessage,
      },
    ]);

    // Call the server action
    try {
      const newMessages = await continuePlaygroundConversation(formData, visualizationId);
      setConversation(newMessages);
      setInput(''); // Clear input after successful submission
    } catch (error) {
      console.error("Error during conversation:", error);
      // Handle error, maybe revert optimistic update or show error message
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="grow overflow-y-auto"> {/* Changed flex-grow to grow */}
        <Messages messages={conversation} />
      </div>
      <form action={handleSubmit} className="p-4 border-t">
        <MultimodalInput
          input={input}
          setInput={setInput}
          handleSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSubmit(formData);
          }}
          // Required props for MultimodalInput - adjust as per actual component definition
          // These might include:
          // chatId, status, stop, attachments, setAttachments, append, selectedVisibilityType
          // For now, we'll pass minimal props and adjust later once we know MultimodalInput's exact props
          chatId="playground-chat" // Placeholder
          status="idle" // Placeholder
          stop={() => {}} // Placeholder
          messages={conversation}
          setMessages={(msgs) => setConversation(msgs as CoreMessage[])} // This might need adjustment based on actual types
        />
      </form>
    </div>
  );
}
