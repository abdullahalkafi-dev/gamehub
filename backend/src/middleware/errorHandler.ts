import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
};

// One place that turns any error into a JSON answer. Internal details are never leaked.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_error',
        message: err.issues[0]?.message ?? 'Invalid input',
        fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err && typeof err === 'object' && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'payload_too_large', message: 'Request too large' } });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: { code: 'invalid_json', message: 'Invalid JSON' } });
  }
  console.error('[error]', err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
};
