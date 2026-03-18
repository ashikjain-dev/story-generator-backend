import { Router } from 'express';
import { parseVideo } from '../controllers/video.controller';

const videoRouter = Router();

// POST /api/v1/video/parse - Validate and parse a YouTube video
videoRouter.post('/parse', parseVideo);

export { videoRouter };
