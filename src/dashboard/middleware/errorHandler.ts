import type { Request, Response, NextFunction } from 'express';

export function notFound(req: Request, res: Response): void {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: `The page "${req.path}" does not exist.`,
  });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Dashboard] Unhandled error:', err);
  const status = (err as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
  res.status(status).render('error', {
    title: 'Server Error',
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'An internal error occurred.',
  });
}
