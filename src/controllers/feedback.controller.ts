import { Request, Response } from 'express';
import { submitFeedback } from '../services/feedback.service';

const COMMENTS_MAX_LENGTH = 1000;

export const createFeedback = async (req: Request, res: Response): Promise<void> => {
  const { name, rating, comments } = req.body ?? {};
  const trimmedComments = typeof comments === 'string' ? comments.trim() : '';

  if (rating === undefined) {
    res.status(400).json({
      status: 'Error',
      message: '`rating` is required.'
    });
    return;
  }

  if (name !== undefined && typeof name !== 'string') {
    res.status(400).json({
      status: 'Error',
      message: '`name` must be a string when provided.'
    });
    return;
  }

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({
      status: 'Error',
      message: '`rating` must be an integer between 1 and 5.'
    });
    return;
  }

  if (comments !== undefined && typeof comments !== 'string' ) {
    res.status(400).json({
      status: 'Error',
      message: '`comments` must be a string when provided.'
    });
    return;
  }

  if (trimmedComments.length > COMMENTS_MAX_LENGTH) {
    res.status(400).json({
      status: 'Error',
      message: `\`comments\` must be at most ${COMMENTS_MAX_LENGTH} characters long.`
    });
    return;
  }

  try {
    await submitFeedback({
      name: typeof name === 'string' && name.trim().length > 0 ? name.trim() : undefined,
      rating,
      comments: trimmedComments
    });

    res.status(201).json({
      status: 'OK',
      message: 'Feedback submitted successfully.'
    });
  } catch (error: any) {
    console.error('[feedback-controller]: Submit Error', error);
    res.status(500).json({
      status: 'Error',
      message: error.message || 'An error occurred while submitting feedback.'
    });
  }
};
