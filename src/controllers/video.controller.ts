import { Request, Response } from 'express';
import { extractVideoId } from '../utils/youtube';
import { getVideoMetadata } from '../services/youtube.service';
import { getDb } from '../config/database';

export const parseVideo = async (req: Request, res: Response): Promise<void> => {
  const url = req.body?.url;

  // Check if URL was provided
  if (!url) {
    res.status(400).json({
      status: 'Error',
      message: 'Please provide a YouTube URL in the request body.'
    });
    return;
  }

  // Step 1 & 2: Validate URL and extract video ID
  const videoId = extractVideoId(url);

  if (!videoId) {
    // Check if it's a YouTube domain without a specific video
    const isYouTubeDomain = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/?$/.test(url);

    res.status(400).json({
      status: 'Error',
      message: isYouTubeDomain
        ? 'Please provide a specific YouTube video URL, not just the YouTube domain.'
        : 'We only accept YouTube video URLs. Please provide a valid youtube.com or youtu.be video link.'
    });
    return;
  }

  try {
    const db = getDb();
    const videoCollection = db.collection('videos');

    // Check if video already exists in cache
    const cachedVideo = await videoCollection.findOne({ videoId });

    if (cachedVideo) {
      res.status(200).json({
        status: 'OK',
        message: 'Video data retrieved from cache!',
        data: {
          videoId: cachedVideo.videoId,
          title: cachedVideo.title,
          duration: cachedVideo.duration,
          description: cachedVideo.description,
          url: cachedVideo.url
        }
      });
      return;
    }

    // Step 3: Check video duration (Metadata fetch)
    const metadata = await getVideoMetadata(videoId);

    if (!metadata) {
      res.status(404).json({
        status: 'Error',
        message: 'YouTube video not found. Please check the URL.'
      });
      return;
    }

    if (metadata.durationInSeconds > 90) {
      res.status(400).json({
        status: 'Error',
        message: `Video is too long (${metadata.durationInSeconds} seconds). We only accept videos up to 60 seconds.`
      });
      return;
    }

    // Step 4: store metadata in DB (Transcript skipped for now)
    const videoData = {
      videoId,
      url,
      title: metadata.title,
      description: metadata.description,
      duration: metadata.durationInSeconds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await videoCollection.insertOne(videoData);

    res.status(200).json({
      status: 'OK',
      message: 'Video metadata parsed and stored successfully!',
      data: {
        videoId: videoData.videoId,
        title: videoData.title,
        duration: videoData.duration,
        description: videoData.description,
        url: videoData.url
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'Error',
      message: error.message || 'An unexpected error occurred while processing the video.'
    });
  }
};
