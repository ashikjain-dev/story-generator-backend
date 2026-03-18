import { randomBytes } from 'crypto';
import { getDb } from '../config/database';

export interface StoryMessage {
  role: 'user' | 'model';
  content: string;
  title?: string;
  timestamp: Date;
}

interface Session {
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
  stories: StoryMessage[];
}

const getCollection = () => getDb().collection<Session>('sessions');

/**
 * Finds a session by its ID
 */
export const findSession = async (sessionId: string): Promise<Session | null> => {
  return await getCollection().findOne({ sessionId });
};

/**
 * Creates a new session document (Awaited)
 */
export const createSession = async (now: Date): Promise<string> => {
  const sessionId = randomBytes(16).toString('hex');
  const newSession: Session = {
    sessionId,
    createdAt: now,
    lastActivity: now,
    stories: []
  };

  await getCollection().insertOne(newSession);
  console.log(`[session-service]: New session created`);
  return sessionId;
};

/**
 * Updates the last activity timestamp (Fire and Forget)
 * We don't await this in the middleware to keep the response fast.
 */
export const updateActivityAsync = (sessionId: string, now: Date): void => {
  getCollection().updateOne(
    { sessionId },
    { $set: { lastActivity: now } }
  ).catch(err => console.error(`[session-service]: Async activity update failed for ${sessionId}`, err));
};

/**
 * Pushes messages to the session's story history (Fire and Forget)
 * Allows sending the story to the user immediately without waiting for DB.
 */
export const pushMessagesAsync = (sessionId: string, messages: StoryMessage[]): void => {
  getCollection().updateOne(
    { sessionId },
    {
      $push: {
        stories: { $each: messages }
      } as any
    }
  ).catch(err => console.error(`[session-service]: Async history push failed for ${sessionId}`, err));
};
