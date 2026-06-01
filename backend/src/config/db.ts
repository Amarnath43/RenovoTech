import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error}`);
    process.exit(1);
  }
};

export { connectDB };