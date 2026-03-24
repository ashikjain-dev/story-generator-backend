import { Router } from 'express';
import { createFeedback } from '../controllers/feedback.controller';

const feedbackRouter = Router();

// POST /api/v1/feedback
feedbackRouter.post('/', createFeedback);

export { feedbackRouter };
