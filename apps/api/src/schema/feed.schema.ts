import { z } from 'zod';

export const FeedItemSchema = z.object({
  id: z.uuid(),
  content: z.string().min(1).max(500),
  authorId: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;
