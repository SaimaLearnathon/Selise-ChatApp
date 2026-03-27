import mongoose from 'mongoose';
import { config } from './index';

export const connectMongo = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongo.url);
    console.log('[MongoDB] connected');
  } catch (err) {
    console.error('[MongoDB] connection error:', err);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] disconnected');
  });
};