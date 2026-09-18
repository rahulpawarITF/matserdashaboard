import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDB = async () => {
  try {
    // If connecting to MongoDB Atlas SRV URI, ensure reliable DNS resolution
    if (env.MONGODB_URI.startsWith('mongodb+srv')) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (dnsErr: any) {
        logger.warn('Could not set custom DNS servers:', dnsErr.message);
      }
    }

    const conn = await mongoose.connect(env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};
