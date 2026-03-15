import { Router } from 'express';
import { parseVideo } from '../controllers/video.controller';

const router = Router();

// POST /api/v1/video/parse - Validate and parse a YouTube video
router.post('/parse', parseVideo);

export default router;
