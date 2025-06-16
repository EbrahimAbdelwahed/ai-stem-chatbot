import { db, documents, chunks } from '../db';
import { generateEmbeddings } from './embedding';
import { eq, or, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Defensive text sanitization to ensure no null bytes reach the database
function sanitizeForDatabase(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
    .normalize('NFKC') // Normalize Unicode
    .trim();
}

// Add a document and its embeddings to the database
export async function addDocument(title: string, content: string, userId?: string | null) {
  if (process.env.RAG_ENABLED !== 'true' || !db) {
    console.warn('RAG is disabled or DB is not initialized. Skipping addDocument.');
    // Consider throwing an error or returning a specific status if preferred
    return null; 
  }
  
  // Defensive sanitization to prevent any null bytes from reaching the database
  const sanitizedTitle = sanitizeForDatabase(title);
  const sanitizedContent = sanitizeForDatabase(content);
  
  // Validate that we have meaningful content after sanitization
  if (!sanitizedContent.trim()) {
    throw new Error('Document content is empty after sanitization');
  }
  
  // First, insert the document with user association
  const [document] = await db
    .insert(documents)
    .values({
      title: sanitizedTitle,
      content: sanitizedContent,
      userId: userId || null, // Associate with user if authenticated, null for anonymous
    })
    .returning({ id: documents.id });

  // Generate embeddings for the document
  const embeddedChunks = await generateEmbeddings(sanitizedContent);

  // Insert the chunks with their embeddings
  for (const chunk of embeddedChunks) {
    // Also sanitize chunk content to be extra safe
    const sanitizedChunkContent = sanitizeForDatabase(chunk.content);
    await db.insert(chunks).values({
      documentId: document.id,
      content: sanitizedChunkContent,
      embedding: chunk.embedding,
    });
  }

  return document.id;
}

// Search for relevant document chunks based on a query with user context
export async function searchDocuments(query: string, limit = 5, userId?: string | null) {
  if (process.env.RAG_ENABLED !== 'true' || !db) {
    console.warn('RAG is disabled or DB is not initialized. Skipping searchDocuments.');
    return []; // Return empty array as if no documents were found
  }
  
  try {
    // Generate embedding for the query
    const [queryEmbedding] = await generateEmbeddings(query);
    
    // Format the embedding as a proper vector literal for PostgreSQL
    const embeddingVector = `[${queryEmbedding.embedding.join(',')}]`;
    
    // Build WHERE clause for user filtering using Drizzle ORM
    let whereCondition;
    if (userId) {
      // Authenticated user: search their documents + public documents + anonymous documents
      whereCondition = or(
        eq(documents.userId, userId),
        eq(documents.isPublic, true),
        isNull(documents.userId)
      );
    } else {
      // Anonymous user: only search public documents and documents uploaded anonymously
      whereCondition = or(
        eq(documents.isPublic, true),
        isNull(documents.userId)
      );
    }
    
    // Use Drizzle ORM with raw SQL for vector similarity search
    const result = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        document_id: chunks.documentId,
        title: documents.title,
        userId: documents.userId,
        isPublic: documents.isPublic,
        similarity: sql<number>`1 - (${chunks.embedding} <=> ${embeddingVector}::vector)`.as('similarity')
      })
      .from(chunks)
      .innerJoin(documents, eq(chunks.documentId, documents.id))
      .where(whereCondition)
      .orderBy(sql`similarity DESC`)
      .limit(limit);
    
    console.log(`[RAG] Search returned ${result.length} relevant documents for user: ${userId || 'anonymous'}`);
    
    return result;
  } catch (error) {
    console.error('[RAG] Error in searchDocuments:', error);
    return [];
  }
} 