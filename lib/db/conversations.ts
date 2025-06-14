import { db } from '@/lib/db'
import { chat, message, toolInvocations } from '@/lib/db/schema'
import { eq, desc, and, ilike, or } from 'drizzle-orm'
import type { Message } from 'ai'

export interface ConversationData {
  userId?: string
  title: string
  model: string
  isArchived?: boolean
}

export interface MessageData {
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  parts?: any[]
  tokenUsage?: any
  metadata?: any
}

export interface ToolInvocationData {
  messageId: string
  toolName: string
  parameters?: any
  result?: any
  executionTime?: number
}

// Conversation Operations
export async function createConversation(data: ConversationData) {
  try {
    const [conversation] = await db.insert(chat)
      .values(data)
      .returning()
    
    return conversation
  } catch (error) {
    console.error('Error creating conversation:', error)
    throw new Error('Failed to create conversation')
  }
}

export async function getUserConversations(userId: string) {
  try {
    return await db.select()
      .from(chat)
      .where(and(
        eq(chat.userId, userId),
        eq(chat.isArchived, false)
      ))
      .orderBy(desc(chat.updatedAt))
  } catch (error) {
    console.error('Error fetching user conversations:', error)
    throw new Error('Failed to fetch conversations')
  }
}

export async function getConversationById(conversationId: string, userId?: string) {
  try {
    const whereCondition = userId 
      ? and(eq(chat.id, conversationId), eq(chat.userId, userId))
      : eq(chat.id, conversationId)
    
    const [conversation] = await db.select()
      .from(chat)
      .where(whereCondition)
    
    return conversation
  } catch (error) {
    console.error('Error fetching conversation:', error)
    throw new Error('Failed to fetch conversation')
  }
}

export async function updateConversation(conversationId: string, data: Partial<ConversationData>) {
  try {
    const [updatedConversation] = await db.update(chat)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chat.id, conversationId))
      .returning()
    
    return updatedConversation
  } catch (error) {
    console.error('Error updating conversation:', error)
    throw new Error('Failed to update conversation')
  }
}

export async function archiveConversation(conversationId: string) {
  try {
    return await updateConversation(conversationId, { isArchived: true })
  } catch (error) {
    console.error('Error archiving conversation:', error)
    throw new Error('Failed to archive conversation')
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    await db.delete(chat)
      .where(eq(chat.id, conversationId))
  } catch (error) {
    console.error('Error deleting conversation:', error)
    throw new Error('Failed to delete conversation')
  }
}

export async function searchConversations(userId: string, searchTerm: string) {
  try {
    return await db.select()
      .from(chat)
      .where(and(
        eq(chat.userId, userId),
        eq(chat.isArchived, false),
        or(
          ilike(chat.title, `%${searchTerm}%`),
          // Search in message content as well
          eq(chat.id, 
            db.select({ id: message.chatId })
              .from(message)
              .where(ilike(message.content, `%${searchTerm}%`))
              .limit(1)
          )
        )
      ))
      .orderBy(desc(chat.updatedAt))
  } catch (error) {
    console.error('Error searching conversations:', error)
    throw new Error('Failed to search conversations')
  }
}

// Message Operations
export async function saveMessage(data: MessageData) {
  try {
    const { conversationId: convId, ...rest } = data as any;

    const [savedMessage] = await db.insert(message)
      .values({ ...rest, chatId: convId })
      .returning()
    
    // Update conversation's updatedAt timestamp
    await db.update(chat)
      .set({ updatedAt: new Date() })
      .where(eq(chat.id, convId))
    
    return savedMessage
  } catch (error) {
    console.error('Error saving message:', error)
    throw new Error('Failed to save message')
  }
}

export async function getConversationMessages(conversationId: string) {
  try {
    return await db.select()
      .from(message)
      .where(eq(message.chatId, conversationId))
      .orderBy(message.createdAt)
  } catch (error) {
    console.error('Error fetching conversation messages:', error)
    throw new Error('Failed to fetch messages')
  }
}

export async function deleteMessage(messageId: string) {
  try {
    await db.delete(message)
      .where(eq(message.id, messageId))
  } catch (error) {
    console.error('Error deleting message:', error)
    throw new Error('Failed to delete message')
  }
}

// Tool Invocation Operations
export async function saveToolInvocation(data: ToolInvocationData) {
  try {
    const [toolInvocation] = await db.insert(toolInvocations)
      .values(data)
      .returning()
    
    return toolInvocation
  } catch (error) {
    console.error('Error saving tool invocation:', error)
    throw new Error('Failed to save tool invocation')
  }
}

export async function getMessageToolInvocations(messageId: string) {
  try {
    return await db.select()
      .from(toolInvocations)
      .where(eq(toolInvocations.messageId, messageId))
      .orderBy(toolInvocations.createdAt)
  } catch (error) {
    console.error('Error fetching tool invocations:', error)
    throw new Error('Failed to fetch tool invocations')
  }
}

// Utility Functions
export function generateConversationTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user')
  if (firstUserMessage && typeof firstUserMessage.content === 'string') {
    return firstUserMessage.content.substring(0, 50).trim() + (firstUserMessage.content.length > 50 ? '...' : '')
  }
  return 'New Conversation'
}

export async function getConversationWithMessages(conversationId: string, userId?: string) {
  try {
    const conversation = await getConversationById(conversationId, userId)
    if (!conversation) return null
    
    const conversationMessages = await getConversationMessages(conversationId)
    
    return {
      ...conversation,
      messages: conversationMessages
    }
  } catch (error) {
    console.error('Error fetching conversation with messages:', error)
    throw new Error('Failed to fetch conversation with messages')
  }
}

// Statistics
export async function getUserConversationStats(userId: string) {
  try {
    const userConversations = await getUserConversations(userId)
    const totalConversations = userConversations.length
    
    let totalMessages = 0
    for (const conversation of userConversations) {
      const msgs = await getConversationMessages(conversation.id)
      totalMessages += msgs.length
    }
    
    return {
      totalConversations,
      totalMessages,
      lastActivity: userConversations[0]?.updatedAt || null
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return {
      totalConversations: 0,
      totalMessages: 0,
      lastActivity: null
    }
  }
} 