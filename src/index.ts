import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import videoRoutes from './routes/video.routes';
import storyRoutes from './routes/story.routes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const apiVersion = '/api/v1';

// Rate limiting setup
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per `window` (here, per 1 minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 'Error',
    message: 'Too many requests from this IP, please try again after 1 minute'
  }
});

// Custom Morgan Token for Indian Standard Time
morgan.token('istDate', () => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
});

// Middleware
app.use(morgan(':istDate -> :url -> :method -> :res[content-length] bytes and :response-time ms'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Health Check API
app.get(`${apiVersion}/health`, (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Story Generator API is healthy' });
});

// Routes
app.use(`${apiVersion}/video`, videoRoutes);
app.use(`${apiVersion}/story`, storyRoutes);

// Handle 404 for undefined routes
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: 'Error',
    message: `Cannot find ${req.method} ${req.originalUrl} on this server!`
  });
});

// Connect to MongoDB and Start Server
connectDatabase().then(() => {
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
});
