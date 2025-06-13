import { relations } from "drizzle-orm/relations";
import { users, analyticsEvents, documents, chunks, conversations, messages, pageViews, sessions, toolInvocations, userUsage, accounts } from "./schema";

export const analyticsEventsRelations = relations(analyticsEvents, ({one}) => ({
	user: one(users, {
		fields: [analyticsEvents.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	analyticsEvents: many(analyticsEvents),
	documents: many(documents),
	conversations: many(conversations),
	pageViews: many(pageViews),
	sessions: many(sessions),
	userUsages: many(userUsage),
	accounts: many(accounts),
}));

export const documentsRelations = relations(documents, ({one, many}) => ({
	user: one(users, {
		fields: [documents.userId],
		references: [users.id]
	}),
	chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({one}) => ({
	document: one(documents, {
		fields: [chunks.documentId],
		references: [documents.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	user: one(users, {
		fields: [conversations.userId],
		references: [users.id]
	}),
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	toolInvocations: many(toolInvocations),
}));

export const pageViewsRelations = relations(pageViews, ({one}) => ({
	user: one(users, {
		fields: [pageViews.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const toolInvocationsRelations = relations(toolInvocations, ({one}) => ({
	message: one(messages, {
		fields: [toolInvocations.messageId],
		references: [messages.id]
	}),
}));

export const userUsageRelations = relations(userUsage, ({one}) => ({
	user: one(users, {
		fields: [userUsage.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));