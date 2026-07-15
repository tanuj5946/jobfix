import express from 'express';
import cors    from 'cors';
import morgan  from 'morgan';
import { env }             from './config/env';
import routes              from './routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// Prisma uses JavaScript bigint for BIGINT columns (for example,
// assessment_results.attempt_id). JSON does not support bigint values, so
// serialize identifiers as strings at the HTTP boundary.
app.set('json replacer', (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value,
);

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'core-service', timestamp: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────────
app.use('/', routes);

// ── Global error handler (must be last) ─────────────────────
app.use(errorMiddleware);

export default app;
