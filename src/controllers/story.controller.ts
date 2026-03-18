import { Request, Response } from 'express';
import { generateStoryFromText } from '../services/ai.service';
import * as sessionService from '../services/session.service';
/**
 * Generates a creative story from text context and saves it to session history
 */
export const generateStory = async (req: Request, res: Response): Promise<void> => {
  const { context } = req.body;

  if (!context || typeof context !== 'string') {
    res.status(400).json({
      status: 'Error',
      message: 'Please provide a valid text context in the request body.'
    });
    return;
  }

  try {
    const sessionId = (req as any).sessionId;

    // 1. Generate story using AI (Must await this to get the content)
    const aiResponse = await generateStoryFromText(context);

    // 2. Prepare message objects for the history
    const historyMessages: sessionService.StoryMessage[] = [
      {
        role: 'user',
        content: context,
        timestamp: new Date()
      },
      {
        role: 'model',
        title: aiResponse.title,
        content: aiResponse.story,
        timestamp: new Date()
      }
    ];

    // 3. --- Fire and Forget ---
    // We send the story to the user IMMEDIATELY.
    // The history save happens in the background.
    sessionService.pushMessagesAsync(sessionId, historyMessages);

    // 4. Send successful response
    res.status(200).json({
      status: 'OK',
      message: 'Story generated!',
      data: {
        sessionId,
        title: aiResponse.title,
        story: aiResponse.story
      }
    });

  } catch (error: any) {
    console.error('[story-controller]: Generation Error', error);
    res.status(500).json({
      status: 'Error',
      message: error.message || 'An error occurred while generating your story.'
    });
  }
};

/**
 * Retrieves the full story history for the current session
 */
export const getHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = (req as any).sessionId;
    const session = await sessionService.findSession(sessionId);

    if (!session) {
      res.status(404).json({
        status: 'Error',
        message: 'Session not found.'
      });
      return;
    }

    res.status(200).json({
      status: 'OK',
      data: {
        sessionId: session.sessionId,
        stories: session.stories || []
      }
    });
  } catch (error: any) {
    console.error('[story-controller]: History Error', error);
    res.status(500).json({
      status: 'Error',
      message: error.message || 'An error occurred while fetching history.'
    });
  }
};
