import { generateStory, getHistory } from '../controllers/story.controller';
import { Router } from 'express';
const storyRouter = Router();

// POST /api/v1/story/generate
storyRouter.post('/generate', generateStory);

// GET /api/v1/story/history
storyRouter.get('/history/:sessionId', getHistory);

export { storyRouter };
