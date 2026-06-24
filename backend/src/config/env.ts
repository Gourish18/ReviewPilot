import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'production';

const requiredEnvVars = [
  'MONGODB_URI',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_CALLBACK_URL',
  'JWT_SECRET',
  'GITHUB_WEBHOOK_SECRET',
  'GEMINI_API_KEY'
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const parsePort = (value: string | undefined) => {
  const parsed = Number(value ?? 8000);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  return parsed;
};

export const env = {
  nodeEnv: (process.env.NODE_ENV ?? 'development') as NodeEnv,
  port: parsePort(process.env.PORT),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI as string,
  githubClientId: process.env.GITHUB_CLIENT_ID as string,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET as string,
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET as string,
  geminiApiKey: process.env.GEMINI_API_KEY as string,
};
