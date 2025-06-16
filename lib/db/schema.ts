import {
  pgTable,
  varchar,
  timestamp,
  jsonb,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  real,
  serial,
  decimal,
} from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

// --- AUTHENTICATION TABLES (from source schema) ---
// Based on the NextAuth.js Drizzle adapter documentation
// https://authjs.dev/reference/adapter/drizzle

export const user = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  password: varchar('password', { length: 255 }),
  emailVerified: timestamp('emailVerified'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  role: varchar('role', { length: 50 }),
  subscriptionTier: varchar('subscription_tier', { length: 50 }),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires').notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// --- CHAT & MESSAGING TABLES (Merged) ---

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  model: varchar('model', { length: 50 }),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  isArchived: boolean('isArchived').default(false),
});

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  parts: jsonb('parts'),
  attachments: jsonb('attachments'),
  tokenUsage: jsonb('tokenUsage'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

// -----------------------------------------------------------------------------
// Legacy aliases (Deprecated)
// These are provided to satisfy type dependencies in migration/helper scripts
// without requiring structural duplication in the database schema. They simply
// reference the new v2 tables.

// Alias to the current `message` table
export const messageDeprecated = message;

// Alias to the current `vote` table
export const voteDeprecated = vote;

// Fallback typings for legacy code paths – treated as `any` to avoid compiler
// errors while we transition away from the deprecated models.
// NOTE: New code SHOULD NOT rely on these types.
export type MessageDeprecated = any;
export type VoteDeprecated = any;

export const toolInvocations = pgTable('tool_invocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('messageId')
    .notNull()
    .references(() => message.id, { onDelete: 'cascade' }),
  toolName: varchar('toolName', { length: 100 }).notNull(),
  parameters: jsonb('parameters'),
  result: jsonb('result'),
  executionTime: integer('executionTime'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- DOCUMENT & RAG TABLES (Merged with compromise) ---

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt'),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet', 'molecule3d'] })
      .notNull()
      .default('text'),
    isPublic: boolean('isPublic').default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export const chunks = pgTable('chunks', {
  id: serial('id').primaryKey(),
  // NOTE: A direct foreign key is not possible here because document.id is not unique.
  // The relationship between a chunk and a document version must be managed by the application.
  documentId: uuid('documentId'),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

// --- STREAMING SUPPORT TABLE ---

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

// --- ANALYTICS TABLES (from source schema) ---

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  eventName: varchar('event_name', { length: 100 }).notNull(),
  eventData: jsonb('event_data'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  sessionId: varchar('session_id', { length: 255 }),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
  page: varchar('page', { length: 255 }),
});

export const webVitalsMetrics = pgTable('web_vitals_metrics', {
  id: serial('id').primaryKey(),
  page: varchar('page', { length: 255 }).notNull(),
  cls: real('cls'),
  inp: real('inp'),
  fcp: real('fcp'),
  lcp: real('lcp'),
  ttfb: real('ttfb'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  sessionId: varchar('session_id', { length: 255 }),
});

export const apiMetrics = pgTable('api_metrics', {
  id: serial('id').primaryKey(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  statusCode: integer('status_code'),
  duration: real('duration').notNull(),
  responseSize: integer('response_size'),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  sessionId: varchar('session_id', { length: 255 }),
});

export const pageViews = pgTable('page_views', {
  id: serial('id').primaryKey(),
  page: varchar('page', { length: 255 }).notNull(),
  referrer: varchar('referrer', { length: 255 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  sessionId: varchar('session_id', { length: 255 }),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
});

// --- DOMAIN-SPECIFIC TABLES (from source schema) ---

export const molecules = pgTable('molecules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  commonNames: text('common_names').array(),
  pdbId: varchar('pdb_id', { length: 10 }),
  pubchemCid: integer('pubchem_cid'),
  smilesNotation: text('smiles_notation'),
  molecularFormula: varchar('molecular_formula', { length: 100 }),
  molecularWeight: decimal('molecular_weight', { precision: 10, scale: 3 }),
  description: text('description'),
  structureType: varchar('structure_type', { length: 20 }).default('small_molecule'),
  embedding: vector('embedding', { dimensions: 1536 }),
  source: varchar('source', { length: 50 }),
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }).default('1.0'),
  lastValidated: timestamp('last_validated').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cachedResults = pgTable('cached_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryHash: varchar('query_hash', { length: 64 }).notNull().unique(),
  result: jsonb('result').notNull(),
  queryType: varchar('query_type', { length: 20 }).default('search'),
  accessCount: integer('access_count').default(0),
  lastAccessed: timestamp('last_accessed').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userUsage = pgTable('user_usage', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  queriesCount: integer('queries_count').default(0),
  uploadsCount: integer('uploads_count').default(0),
  moleculeLookupsCount: integer('molecule_lookups_count').default(0),
  storageMb: integer('storage_mb').default(0),
  lastReset: timestamp('last_reset').defaultNow(),
});

// --- TYPE EXPORTS ---

export type User = InferSelectModel<typeof user>;
export type Chat = InferSelectModel<typeof chat>;
export type DBMessage = InferSelectModel<typeof message>;
export type Vote = InferSelectModel<typeof vote>;
export type Document = InferSelectModel<typeof document>;
export type Suggestion = InferSelectModel<typeof suggestion>;
export type Stream = InferSelectModel<typeof stream>;
export type Molecule = InferSelectModel<typeof molecules>;
export type Chunk = InferSelectModel<typeof chunks>;