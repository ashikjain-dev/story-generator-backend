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
    // 1. Generate story using AI
    const aiResponse = await generateStoryFromText(context);

    // 2. Store in MongoDB
    const db = getDb();
    const storyCollection = db.collection('stories');

    const storyData = {
      title: aiResponse.title,
      content: aiResponse.story,
      inputContext: context,
      createdAt: new Date(),
    };

    const result = await storyCollection.insertOne(storyData);

    // 3. Send response
    res.status(200).json({
      status: 'OK',
      message: 'Story generated and saved successfully!',
      data: {
        id: result.insertedId,
        ...storyData
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
