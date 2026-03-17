import { GoogleGenAI } from '@google/genai';

export interface StoryResponse {
  story: string;
  title: string;
}

export const generateStoryFromText = async (context: string): Promise<StoryResponse> => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in the .env file');
  }

  // Initialize the new GenAI client using the factory function
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are a professional creative storyteller. 
    Based on the following context, generate a creative, engaging, and unique story.
    
    Context: "${context}"
    Rules:
    - Maximum 150 words
    - Focus on emotions
    - Make the story unique
  `;

  try {
    // Using the new SDK syntax
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Defaulting to the latest flash model
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
      }
    });

    if (!response || !response.text) {
      throw new Error('AI returned an empty or invalid response.');
    }

    const text = response.text;


    return { title: context, story: text };
  } catch (error: any) {
    console.error('[ai-service]: Error generating story with Gemini', error);
    throw new Error(error.message || 'Failed to generate story from AI provider.');
  }
};
