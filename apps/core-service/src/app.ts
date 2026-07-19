import express from 'express';
import cors    from 'cors';
import cookieParser from 'cookie-parser';
import morgan  from 'morgan';
import helmet  from 'helmet';
import { env }             from './config/env';
import routes              from './routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { apiRateLimit }   from './middleware/rateLimit.middleware';
import { HttpError }      from './utils/httpError';

const app = express();
const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);

// Prisma uses JavaScript bigint for BIGINT columns (for example,
// assessment_results.attempt_id). JSON does not support bigint values, so
// serialize identifiers as strings at the HTTP boundary.
app.set('json replacer', (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value,
);

// ── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new HttpError(403, 'Origin is not allowed by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-Id'],
  maxAge: 86_400,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(apiRateLimit);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'core-service', timestamp: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────────
app.use('/', routes);
app.use(notFoundMiddleware);

// ── Global error handler (must be last) ─────────────────────
app.use(errorMiddleware);

export default app;
