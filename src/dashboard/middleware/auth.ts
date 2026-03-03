import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.redirect('/login');
    return;
  }
  if (req.user?.id !== process.env['BOT_OWNER_ID']) {
    res.status(403).render('error', {
      title: 'Forbidden',
      message: 'Only the bot owner can access this page.',
    });
    return;
  }
  next();
}
