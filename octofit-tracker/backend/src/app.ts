import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes/api.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (_request, response) => response.json({ ok: true }));
  app.use('/api', apiRouter);
  app.use((error: Error & { status?: number; statusCode?: number }, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const invalidData = error.name === 'ValidationError' || error.name === 'CastError';
    const status = error.status ?? error.statusCode ?? (invalidData ? 400 : 500);
    response.status(status).json({ error: status >= 500 ? 'Internal server error' : error.message });
  });
  return app;
}
