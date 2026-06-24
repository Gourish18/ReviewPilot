import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import authRouter from './routes/auth.routes.js';
import repositoryRouter from './routes/repository.routes.js';
import webhookRouter from './routes/webhook.routes.js';
import reviewRouter from './routes/review.routes.js';
import { requireAuth } from './middleware/requireAuth.js';

export const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);

app.use('/api/webhooks', webhookRouter);

app.use(express.json({
  limit: '1mb'
}));

app.use('/api/auth', authRouter);
app.use('/api/repositories', repositoryRouter);
app.use('/api/reviews', reviewRouter);

// Temporary test route to verify authentication middleware
app.get('/api/test/protected', requireAuth, (req, res) => {
  res.status(200).json({
    message: 'Authenticated',
    userId: req.userId,
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'reviewpilot-backend',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});
