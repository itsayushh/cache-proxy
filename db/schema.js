import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const cacheMetadata = sqliteTable('cache_metadata', {
  hash: text('hash').primaryKey(),
  url: text('url').notNull(),
  path: text('path').notNull(),
  extension: text('extension'),
  contentType: text('content_type'),
  headers: text('headers'), // JSON stringified
  createdAt: text('created_at').default(new Date().toISOString()),
  lastAccessed: text('last_accessed'),
});
