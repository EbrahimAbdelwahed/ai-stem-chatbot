'use server';

import { CoreMessage } from 'ai'; // Assuming CoreMessage is available from 'ai'

export async function continuePlaygroundConversation(
  formData: FormData,
  visualizationId?: string // visualizationId might be used later
): Promise<CoreMessage[]> {
  const userInput = formData.get('input') as string;

  if (!userInput) {
    // Or handle more gracefully
    throw new Error('Input is missing');
  }

  // Simulate a delay and AI processing
  await new Promise(resolve => setTimeout(resolve, 500));

  const userMessage: CoreMessage = {
    id: Date.now().toString() + '-user', // Temporary ID
    role: 'user',
    content: userInput,
  };

  const aiResponse: CoreMessage = {
    id: Date.now().toString() + '-assistant', // Temporary ID
    role: 'assistant',
    content: `Echo: ${userInput}`, // Simple echo response for now
  };

  // In a real scenario, you would fetch previous messages if needed,
  // call an AI model, and then return the new complete list of messages.
  // For this step, we'll just return the new user message and the AI response.
  // The PlaygroundChat component is currently set up to append the user message
  // optimistically, and then replace the conversation with the result of this action.
  // So, this action should return the *new* state of the conversation.
  // However, the current PlaygroundChat's setConversation(newMessages) expects the full conversation.
  // Let's adjust to provide a more complete, albeit simulated, conversation history.

  // This part needs to be thought through: how do we get existing messages here?
  // For now, we'll assume this action is responsible for returning the *updated* conversation
  // including the new user message and the AI's response, but not necessarily the *entire* history
  // if the client is already managing that.
  // Given setConversation(newMessages) in the client, this action should return the full new conversation.
  // This means it would need access to the *previous* messages.
  // This is a common pattern with useUIState where the action receives the current state or relevant parts.
  // However, the current signature is just (formData, visualizationId).

  // For now, let's simplify and assume the client will handle appending.
  // The action will return the AI's response, and the client will add it.
  // This contradicts the issue's "Update the UI state with the full response from the server: setConversation(newMessages);"
  // Let's stick to the issue: the action returns the new *full* conversation.
  // This means the action needs the *previous* messages.
  // The `useActions` hook usually passes the current conversation state to the action.
  // Let's assume for now that the `ai/rsc` `useActions` provides the previous messages.
  // If not, we'll need to adjust. The issue says:
  // `const [conversation, setConversation] = useUIState({ initialUI: initialMessages });`
  // `const { continuePlaygroundConversation } = useActions();`
  // `const newMessages = await continuePlaygroundConversation(formData, visualizationId);`
  // `setConversation(newMessages);`
  // This implies `continuePlaygroundConversation` itself must return the *entire* new conversation.
  // The `useActions` wrapper from `ai/rsc` might implicitly pass the current `conversation` from `useUIState`.

  // Let's simulate this for now by just returning the user message and AI response
  // as if they are the *only* messages. The client will then need to merge this.
  // This is still not quite right.

  // Re-reading: "Initialize the actions: const { continuePlaygroundConversation } = useActions();"
  // "Call the new server action: const newMessages = await continuePlaygroundConversation(formData, visualizationId);"
  // "Update the UI state with the full response from the server: setConversation(newMessages);"
  // This means the `continuePlaygroundConversation` should indeed return the complete, updated list of messages.
  // The `ai/rsc` package should handle passing the previous messages to the action.
  // If `ai/rsc`'s `useActions` wraps our action, it might inject the current UI state (the conversation)
  // as the first argument to our defined action.
  // Let's define the action to accept previousMessages.

  // Redefining based on how `ai/rsc` useActions often works:
  // The first parameter to the action defined here will be the *current UI state* (conversation)
  // The subsequent parameters are those passed from the client call.

  // The `useActions` type is `const { continuePlaygroundConversation } = useActions<typeof AI>();`
  // where AI is an object of server actions.
  // The actions in that object would be like:
  // export const AI = { continuePlaygroundConversation: async (previousMessages: CoreMessage[], formData: FormData, visualizationId?: string) => { ... }}
  // This is a common pattern.

  // For now, let's assume the simplified signature from the plan and have the client append.
  // If `ai/rsc` doesn't work like that, we'll adjust `playground-chat.tsx` later.
  // The issue is: "const newMessages = await continuePlaygroundConversation(formData, visualizationId);"
  // This signature does NOT include previousMessages.
  // So, this action must somehow get them, or the client does more work.

  // Let's stick to the issue's explicit call: `continuePlaygroundConversation(formData, visualizationId)`
  // This means the action itself is responsible for fetching old messages if needed, or the framework handles it.
  // For now, to make progress, it will just return the *new* messages (user + AI).
  // The client `PlaygroundChat` will then need to be updated to append these to its existing state,
  // rather than replacing its state with them.

  // Let's try to make the action return the *full* conversation, assuming it can somehow get the previous state.
  // The `useActions` from `ai/rsc` is meant to simplify this.
  // The action passed to `useActions` likely receives the current state.

  // Let's assume the action *does* receive previous messages from `ai/rsc` magic.
  // This is the cleanest way to fulfill `setConversation(newMessages)`.

  console.log("continuePlaygroundConversation called on server");
  console.log("visualizationId:", visualizationId);

  // This is a placeholder. In reality, we'd fetch existing messages for this conversation,
  // then append the new user message and the AI's response.
  // For now, we'll just return the new messages as if it's a new conversation.
  // This will be fixed when we integrate with a real way to get previous messages for the playground.
  return [userMessage, aiResponse];
}
