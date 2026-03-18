import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { getDb } from '../config/database';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const sessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const db = getDb();
  const sessionCollection = db.collection('sessions');

  // 1. Try to get sessionId from cookie or header
  let sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
  const now = new Date();

  try {
    if (sessionId) {
      // 2. Check if session exists and is still valid (not inactive for > 15 mins)
      const session = await sessionCollection.findOne({ sessionId });
      if (session) {
        const lastActivity = new Date(session.lastActivity);
        const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

        if (timeSinceLastActivity < SESSION_TIMEOUT) {
          // Session is valid - update lastActivity
          // Session is not expired, using the same session
          console.log(`[session]: Session is not expired, using the same session.`);
          await sessionCollection.updateOne(
            { sessionId },
            { $set: { lastActivity: now } }
          );

          // Refresh the cookie to extend the 15-minute window from NOW
          res.cookie('sessionId', sessionId, {
            httpOnly: true,
            maxAge: SESSION_TIMEOUT,
            sameSite: 'lax'
          });

          (req as any).sessionId = sessionId;
          return next();
        } else {
          // Session expired due to inactivity
          console.log(`[session]: Session expired due to 15 mins inactivity.`);
        }
      }
    }

    // call createSessionAndInsertInDB
    const newSessionId: string = await createNewSessionAndInsertInDB(sessionCollection, now);

    // 4. Set cookie and attach to request
    res.cookie('sessionId', newSessionId, {
      httpOnly: true,
      maxAge: SESSION_TIMEOUT,
      sameSite: 'lax'
    });

    (req as any).sessionId = newSessionId;
    next();
  } catch (error) {
    console.error('[session-middleware]: Error handling session', error);
    next(); // Continue even if session fails, though we might want to handle this more strictly later
  }
};


async function createNewSessionAndInsertInDB(sessionCollection: any, now: Date) {
  try {
    //  Create a new session if none found or if expired
    const newSessionId = randomBytes(16).toString('hex');
    const newSession = {
      sessionId: newSessionId,
      createdAt: now,
      lastActivity: now,
      stories: []
    };

    await sessionCollection.insertOne(newSession);
    console.log(`[session]: New session created`);
    return newSessionId;
  } catch (error) {
    console.error('[session-middleware]: Error creating new session', error);
    throw error;
  }


}