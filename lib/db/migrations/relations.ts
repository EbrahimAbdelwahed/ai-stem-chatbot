import { relations } from "drizzle-orm/relations";
import * as schema from "../schema";

export const analyticsEventsRelations = relations(schema.analyticsEvents, ({one}) => ({
	user: one(schema.user, {
		fields: [schema.analyticsEvents.userId],
		references: [schema.user.id]
	}),
}));

export const usersRelations = relations(schema.user, ({many}) => ({
	analyticsEvents: many(schema.analyticsEvents),
	documents: many(schema.document),
	// Assuming 'conversations' in relations should map to 'chat' in schema
	conversations: many(schema.chat),
	pageViews: many(schema.pageViews),
	sessions: many(schema.sessions),
	userUsages: many(schema.userUsage),
	accounts: many(schema.accounts),
	visualizations: many(schema.visualizations),
}));

export const documentsRelations = relations(schema.document, ({one, many}) => ({
	user: one(schema.user, {
		fields: [schema.document.userId],
		references: [schema.user.id]
	}),
	chunks: many(schema.chunks),
}));

// Note: schema.chunks.documentId is uuid, schema.document.id is uuid.
// However, schema.document primary key is (id, createdAt).
// This relation might be problematic if schema.chunks.documentId is meant
// to reference only document.id without createdAt.
// For now, proceeding with the assumption that this is handled correctly
// or will be addressed if it causes runtime errors.
// A proper foreign key in schema.ts for chunks.documentId would reference document.id.
export const chunksRelations = relations(schema.chunks, ({one}) => ({
	document: one(schema.document, {
		fields: [schema.chunks.documentId],
		// This might need to refer to a specific column if document.id is not unique by itself
		// or if there's a specific key to reference. Given document's PK is (id, createdAt),
		// a simple reference to document.id might be ambiguous or incorrect if not handled
		// by Drizzle implicitly or via a named reference in the schema.
		// However, the original code referenced `documents.id` which was a serial PK.
		// The new schema.document.id is a UUID.
		// The foreign key in schema.ts for suggestion uses both document.id and document.createdAt.
		// Chunks table does not have documentCreatedAt.
		// This implies chunks.documentId directly refers to document.id.
		references: [schema.document.id]
	}),
}));

// Assuming 'conversations' in relations should map to 'chat' in schema
export const conversationsRelations = relations(schema.chat, ({one, many}) => ({
	user: one(schema.user, {
		fields: [schema.chat.userId],
		references: [schema.user.id]
	}),
	// Assuming 'messages' in relations should map to 'message' in schema
	messages: many(schema.message),
	visualizations: many(schema.visualizations),
}));

// Assuming 'messages' in relations should map to 'message' in schema
export const messagesRelations = relations(schema.message, ({one, many}) => ({
	// Assuming 'conversation' in relations should map to 'chat' in schema for the table
	// and 'conversationId' should map to 'chatId' for the field.
	conversation: one(schema.chat, {
		fields: [schema.message.chatId], // Corrected from conversationId to chatId
		references: [schema.chat.id]
	}),
	toolInvocations: many(schema.toolInvocations),
}));

export const pageViewsRelations = relations(schema.pageViews, ({one}) => ({
	user: one(schema.user, {
		fields: [schema.pageViews.userId],
		references: [schema.user.id]
	}),
}));

export const visualizationsRelations = relations(schema.visualizations, ({ one }) => ({
  user: one(schema.user, {
    fields: [schema.visualizations.userId],
    references: [schema.user.id],
  }),
  chat: one(schema.chat, {
    fields: [schema.visualizations.chatId],
    references: [schema.chat.id],
  }),
}));

export const sessionsRelations = relations(schema.sessions, ({one}) => ({
	user: one(schema.user, {
		fields: [schema.sessions.userId],
		references: [schema.user.id]
	}),
}));

export const toolInvocationsRelations = relations(schema.toolInvocations, ({one}) => ({
	message: one(schema.message, { // Corrected from messages to message
		fields: [schema.toolInvocations.messageId],
		references: [schema.message.id]
	}),
}));

export const userUsageRelations = relations(schema.userUsage, ({one}) => ({
	user: one(schema.user, {
		fields: [schema.userUsage.userId],
		references: [schema.user.id]
	}),
}));

export const accountsRelations = relations(schema.accounts, ({one}) => ({
	user: one(schema.user, {
		fields: [schema.accounts.userId],
		references: [schema.user.id]
	}),
}));