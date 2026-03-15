import { MongoClient, Db } from 'mongodb';

let db: Db;

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in the .env file');
    }

    const client = new MongoClient(mongoURI);
    await client.connect();

    db = client.db(); // Uses the database name from the URI
    console.log('[database]: MongoDB connected successfully');
  } catch (error) {
    console.error('[database]: MongoDB connection failed', error);
    process.exit(1);
  }
};

export const getDb = (): Db => {
  if (!db) {
    throw new Error('[database]: Database not initialized. Call connectDatabase() first.');
  }
  return db;
};
