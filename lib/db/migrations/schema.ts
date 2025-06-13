import { pgTable, serial, varchar, integer, real, boolean, text, timestamp, unique, uuid, jsonb, numeric, vector, foreignKey, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"




export const apiMetrics = pgTable("api_metrics", {
	id: serial().primaryKey().notNull(),
	endpoint: varchar({ length: 255 }).notNull(),
	method: varchar({ length: 10 }).notNull(),
	statusCode: integer("status_code"),
	duration: real().notNull(),
	responseSize: integer("response_size"),
	success: boolean().notNull(),
	errorMessage: text("error_message"),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	sessionId: varchar("session_id", { length: 255 }),
});

export const cachedResults = pgTable("cached_results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	queryHash: varchar("query_hash", { length: 64 }).notNull(),
	result: jsonb().notNull(),
	queryType: varchar("query_type", { length: 20 }).default('search'),
	accessCount: integer("access_count").default(0),
	lastAccessed: timestamp("last_accessed", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		cachedResultsQueryHashUnique: unique("cached_results_query_hash_unique").on(table.queryHash),
	}
});

export const molecules = pgTable("molecules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	commonNames: text("common_names").array(),
	pdbId: varchar("pdb_id", { length: 10 }),
	pubchemCid: integer("pubchem_cid"),
	smilesNotation: text("smiles_notation"),
	molecularFormula: varchar("molecular_formula", { length: 100 }),
	molecularWeight: numeric("molecular_weight", { precision: 10, scale:  3 }),
	description: text(),
	structureType: varchar("structure_type", { length: 20 }).default('small_molecule'),
	embedding: vector({ dimensions: 1536 }),
	source: varchar({ length: 50 }),
	confidenceScore: numeric("confidence_score", { precision: 3, scale:  2 }).default('1.0'),
	lastValidated: timestamp("last_validated", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const webVitalsMetrics = pgTable("web_vitals_metrics", {
	id: serial().primaryKey().notNull(),
	page: varchar({ length: 255 }).notNull(),
	cls: real(),
	inp: real(),
	fcp: real(),
	lcp: real(),
	ttfb: real(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	sessionId: varchar("session_id", { length: 255 }),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	password: text(),
	emailVerified: timestamp({ mode: 'string' }),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		usersEmailUnique: unique("users_email_unique").on(table.email),
	}
});

export const analyticsEvents = pgTable("analytics_events", {
	id: serial().primaryKey().notNull(),
	eventName: varchar("event_name", { length: 100 }).notNull(),
	eventData: jsonb("event_data"),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	sessionId: varchar("session_id", { length: 255 }),
	userId: uuid("user_id"),
	page: varchar({ length: 255 }),
},
(table) => {
	return {
		analyticsEventsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "analytics_events_user_id_users_id_fk"
		}).onDelete("set null"),
	}
});

export const documents = pgTable("documents", {
	id: serial().primaryKey().notNull(),
	userId: uuid(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	isPublic: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		documentsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "documents_userId_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const chunks = pgTable("chunks", {
	id: serial().primaryKey().notNull(),
	documentId: integer("document_id"),
	content: text().notNull(),
	embedding: vector({ dimensions: 1536 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		chunksDocumentIdDocumentsIdFk: foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "chunks_document_id_documents_id_fk"
		}).onDelete("cascade"),
	}
});

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid(),
	title: varchar({ length: 255 }).notNull(),
	model: varchar({ length: 50 }).notNull(),
	isArchived: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		conversationsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conversations_userId_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid().notNull(),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	parts: jsonb(),
	tokenUsage: jsonb(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		messagesConversationIdConversationsIdFk: foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversationId_conversations_id_fk"
		}).onDelete("cascade"),
	}
});

export const pageViews = pgTable("page_views", {
	id: serial().primaryKey().notNull(),
	page: varchar({ length: 255 }).notNull(),
	referrer: varchar({ length: 255 }),
	userAgent: text("user_agent"),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	sessionId: varchar("session_id", { length: 255 }),
	userId: uuid("user_id"),
},
(table) => {
	return {
		pageViewsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "page_views_user_id_users_id_fk"
		}).onDelete("set null"),
	}
});

export const sessions = pgTable("sessions", {
	sessionToken: text().primaryKey().notNull(),
	userId: uuid().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		sessionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_userId_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const toolInvocations = pgTable("tool_invocations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	messageId: uuid().notNull(),
	toolName: varchar({ length: 100 }).notNull(),
	parameters: jsonb(),
	result: jsonb(),
	executionTime: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		toolInvocationsMessageIdMessagesIdFk: foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "tool_invocations_messageId_messages_id_fk"
		}).onDelete("cascade"),
	}
});

export const userUsage = pgTable("user_usage", {
	userId: uuid("user_id").primaryKey().notNull(),
	queriesCount: integer("queries_count").default(0),
	uploadsCount: integer("uploads_count").default(0),
	moleculeLookupsCount: integer("molecule_lookups_count").default(0),
	storageMb: integer("storage_mb").default(0),
	lastReset: timestamp("last_reset", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		userUsageUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_usage_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const verificationTokens = pgTable("verification_tokens", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		verificationTokensIdentifierTokenPk: primaryKey({ columns: [table.identifier, table.token], name: "verification_tokens_identifier_token_pk"}),
	}
});

export const accounts = pgTable("accounts", {
	userId: uuid().notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
},
(table) => {
	return {
		accountsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_userId_users_id_fk"
		}).onDelete("cascade"),
		accountsProviderProviderAccountIdPk: primaryKey({ columns: [table.provider, table.providerAccountId], name: "accounts_provider_providerAccountId_pk"}),
	}
});