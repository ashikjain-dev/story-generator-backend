import { Router } from 'express';
import { generateStory } from '../controllers/story.controller';

const router = Router();

// POST /api/v1/story/generate
router.post('/generate', generateStory);

export default router;
