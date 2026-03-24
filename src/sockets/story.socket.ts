import { Server, Socket } from 'socket.io';
import { generateStoryFromText } from '../services/ai.service';
import * as sessionService from '../services/session.service';

const SOCKET_WINDOW_MS = 60 * 1000; // 1 minute
const SOCKET_MAX_REQUESTS = 10;
const SESSION_WINDOW_MS = 60 * 1000; // 1 minute
const SESSION_MAX_REQUESTS = 10;
const PRUNE_INTERVAL_MS = 30 * 1000;

type LimitEntry = { count: number; windowStart: number };

const socketRequestCounts = new Map<string, LimitEntry>();
const sessionRequestCounts = new Map<string, LimitEntry>();
let pruneInterval: NodeJS.Timeout | null = null;

const pruneExpiredEntries = (
  store: Map<string, LimitEntry>,
  windowMs: number,
  now: number
): void => {
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart >= windowMs) {
      store.delete(key);
    }
  }
};

const startBackgroundPruner = (): void => {
  if (pruneInterval) return;

  pruneInterval = setInterval(() => {
    const now = Date.now();
    pruneExpiredEntries(socketRequestCounts, SOCKET_WINDOW_MS, now);
    pruneExpiredEntries(sessionRequestCounts, SESSION_WINDOW_MS, now);
  }, PRUNE_INTERVAL_MS);
};

const checkRateLimit = (
  key: string,
  store: Map<string, LimitEntry>,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; retryAfterSeconds?: number } => {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  store.set(key, entry);
  return { allowed: true };
};

/**
 * Handles all story-related events for a specific socket connection.
 */
export const registerStoryHandlers = (io: Server, socket: Socket) => {
  startBackgroundPruner();
  // sessionId is attached via the middleware bridge in sockets/socket.ts
  const sessionId = (socket.request as any).sessionId;

  socket.on('story:generate', async (data: { context: string }) => {
    const { context } = data;
    const socketLimit = checkRateLimit(
      socket.id,
      socketRequestCounts,
      SOCKET_WINDOW_MS,
      SOCKET_MAX_REQUESTS
    );

    if (!socketLimit.allowed) {
      socket.emit('story:error', {
        code: 429,
        message: 'Too many requests from this socket. Please try again shortly.',
        retryAfterSeconds: socketLimit.retryAfterSeconds
      });
      return;
    }

    if (sessionId) {
      const sessionLimit = checkRateLimit(
        sessionId,
        sessionRequestCounts,
        SESSION_WINDOW_MS,
        SESSION_MAX_REQUESTS
      );

      if (!sessionLimit.allowed) {
        socket.emit('story:error', {
          code: 429,
          message: 'Too many requests for this session. Please try again shortly.',
          retryAfterSeconds: sessionLimit.retryAfterSeconds
        });
        return;
      }
    }

    if (!context || typeof context !== 'string') {
      socket.emit('story:error', { message: 'A valid text context is required.' });
      return;
    }

    try {
      // 1. Emit initial status back to the user
      socket.emit('story:status', { message: 'AI is crafting your story...' });

      // 2. Generate the story stream using AI service
      const stream = await generateStoryFromText(context);
      let fullStory = '';

      // 3. Iterate over the stream and emit chunks to the user
      for await (const chunk of stream) {
        const chunkText = chunk.choices[0]?.delta?.content || '';
        if (chunkText) {
          fullStory += chunkText;
          socket.emit('story:chunk', { text: chunkText });
        }
      }

      // 4. Emit the final completion event
      socket.emit('story:received', {
        title: context,
        story: fullStory,
        timestamp: new Date()
      });

      // 5. Save the full interaction to MongoDB (Fire and Forget)
      if (sessionId) {
        const historyMessages: sessionService.StoryMessage[] = [
          { role: 'user', content: context, timestamp: new Date() },
          {
            role: 'model',
            title: context,
            content: fullStory,
            timestamp: new Date()
          }
        ];
        sessionService.pushMessagesAsync(sessionId, historyMessages);
        sessionService.updateActivityAsync(sessionId, new Date());
      }



    } catch (error: any) {
      console.error('[socket-handler]: Story Generation Error', error);
      socket.emit('story:error', {
        message: error.message || 'An error occurred while generating your story.'
      });
    }
  });

  socket.on('disconnect', () => {
    socketRequestCounts.delete(socket.id);
  });
};
