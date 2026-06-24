import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongodbUri, {
    autoIndex: env.nodeEnv !== 'production',
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
};
