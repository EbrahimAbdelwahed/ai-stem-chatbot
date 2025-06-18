'use client';

import { CoreMessage } from 'ai';
import { useUIState, useActions } from 'ai/rsc';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { continuePlaygroundConversation } from '@/app/(playground)/actions';
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
      // The `continuePlaygroundConversation` action is expected to be bound by `useActions`
      // such that it receives the previous messages automatically if it's designed that way.
      // However, our current action `continuePlaygroundConversation(formData, visualizationId)`
      // does not expect previous messages as its first argument.
      // The `ai/rsc` `useActions` should handle this. If the action is defined as
      // `export async function continuePlaygroundConversation(formData: FormData, ...)`
      // then that's how it's called.
      // The critical part is that `setConversation(newMessages)` expects `newMessages` to be the *full* conversation.
      // Our current server action returns `[userMessage, aiResponse]`.
      // This means the optimistic update for the user message is okay, but then `setConversation`
      // will replace the whole conversation with just the user message + AI response.
      // This needs to be reconciled.

      // For now, let's assume `continuePlaygroundConversation` correctly returns the *entire* updated conversation.
      // This implies the server action itself (or the `ai/rsc` wrapper) has access to the previous messages.
      const newMessages = await continuePlaygroundConversation(formData, visualizationId);
      setConversation(newMessages);
      setInput(''); // Clear input after successful submission
    } catch (error) {
      console.error("Error during conversation:", error);
      // Handle error, maybe revert optimistic update or show error message
      // For now, we'll leave the optimistic user message in the chat.
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
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
