import { getDb } from '../config/database';

export interface FeedbackInput {
  name?: string;
  rating: number;
  comments?: string | undefined;
}

interface FeedbackDocument extends FeedbackInput {
  createdAt: Date;
}

const getCollection = () => getDb().collection<FeedbackDocument>('feedbacks');

export const submitFeedback = async (payload: FeedbackInput): Promise<void> => {
  const feedbackDocument: FeedbackDocument = {
    ...payload,
    createdAt: new Date()
  };

  await getCollection().insertOne(feedbackDocument);
};
