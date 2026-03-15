import axios from 'axios';
import { parse } from 'iso8601-duration';
interface VideoMetadata {
  videoId: string;
  title: string;
  description: string;
  durationInSeconds: number;
}

export const getVideoMetadata = async (videoId: string): Promise<VideoMetadata | null> => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not defined in the .env file');
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: apiKey,
      },
    });

    const videoItem = response.data.items?.[0];

    if (!videoItem) {
      return null;
    }

    const { snippet, contentDetails } = videoItem;

    // Parse ISO 8601 duration (e.g., PT1M5S) to total seconds
    const duration = parse(contentDetails.duration);
    const totalSeconds = (duration.hours || 0) * 3600 + (duration.minutes || 0) * 60 + (duration.seconds || 0);

    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      durationInSeconds: totalSeconds,
    };
  } catch (error) {
    console.error('[youtube-service]: Error fetching video metadata', error);
    throw new Error('Failed to fetch video details from YouTube.');
  }
};
