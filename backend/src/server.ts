import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(env.port, () => {
      console.log(`ReviewPilot backend listening on port ${env.port}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start ReviewPilot backend:', error);
    process.exit(1);
  }
};

void startServer();
