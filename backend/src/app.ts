import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import authRouter from './routes/auth.routes.js';
import repositoryRouter from './routes/repository.routes.js';
import webhookRouter from './routes/webhook.routes.js';
import reviewRouter from './routes/review.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import settingsRouter from './routes/settings.routes.js';
import { requireAuth } from './middleware/requireAuth.js';

export const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);

// 1. Raw body parser specifically and ONLY for the GitHub webhook endpoint
// Must be registered BEFORE express.json() so GitHub webhooks are preserved as raw Buffers for HMAC signature verification
app.use('/api/webhooks/github', express.raw({ type: 'application/json' }));

// 2. Global JSON body parser for all other application routes
app.use(express.json({
  limit: '1mb'
}));

// 3. Application Routes
app.use('/api/webhooks', webhookRouter);
app.use('/api/auth', authRouter);
app.use('/api/repositories', repositoryRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);

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
