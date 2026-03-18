import { Request, Response } from 'express';
import { generateStoryFromText } from '../services/ai.service';
import { getDb } from '../config/database';

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
    console.log('[story-controller]: Generating story...');
    const db = getDb();
    const sessionCollection = db.collection('sessions');
    const sessionId = (req as any).sessionId;

    // 1. Generate story using AI first
    const aiResponse = await generateStoryFromText(context);

    // 2. Prepare the messages to push
    const userMessage = {
      role: 'user',
      content: context,
      timestamp: new Date()
    };


    const aiMessage = {
      role: 'model',
      title: aiResponse.title,
      content: aiResponse.story,
      timestamp: new Date()
    };

    // 3. Push both messages to the session's messages array
    await sessionCollection.updateOne(
      { sessionId },
      {
        $push: {
          stories: { $each: [userMessage, aiMessage] }
        } as any
      }
    );

    // 4. Send response
    res.status(200).json({
      status: 'OK',
      message: 'Story generated and conversation updated!',
      data: {
        sessionId,
        title: aiResponse.title,
        story: aiResponse.story
      }
    });

  } catch (error: any) {
    console.error('[story-controller]: Error', error);
    res.status(500).json({
      status: 'Error',
      message: error.message || 'An error occurred while generating your story.'
    });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {

  const { sessionId } = req.params;
  try {
    const db = getDb();
    const sessionCollection = db.collection('sessions');

    const session = await sessionCollection.findOne({ sessionId });

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
        stories: session.stories
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
