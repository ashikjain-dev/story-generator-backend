import { Request, Response, NextFunction } from 'express';
import * as sessionService from '../services/session.service';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const sessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Try to get sessionId from cookie or header
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
  const now = new Date();

  try {
    if (sessionId) {
      // 2. Check if session exists and is still valid
      const session = await sessionService.findSession(sessionId);

      if (session) {
        const lastActivity = new Date(session.lastActivity);
        const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

        if (timeSinceLastActivity < SESSION_TIMEOUT) {
          // --- Fire and Forget ---
          // Don't wait for the DB to update activity
          sessionService.updateActivityAsync(sessionId, now);
          console.log(`[session]: Using existing session.`);
          // Refresh the cookie to keep the 15-min window sliding
          res.cookie('sessionId', sessionId, {
            httpOnly: true,
            maxAge: SESSION_TIMEOUT,
            sameSite: 'lax'
          });

          (req as any).sessionId = sessionId;
          return next();
        }
        // If expired, the flow continues below to create a new session
        console.log(`[session]: Session ${sessionId} expired due to inactivity.`);
      }
    }

    // 3. Create a new session (Must await to ensure the document exists for the next request)
    const newSessionId = await sessionService.createSession(now);

    res.cookie('sessionId', newSessionId, {
      httpOnly: true,
      maxAge: SESSION_TIMEOUT,
      sameSite: 'lax'
    });

    (req as any).sessionId = newSessionId;
    next();
  } catch (error) {
    console.error('[session-middleware]: Error handling session', error);
    next(); // Fallback to let the request continue
  }
};