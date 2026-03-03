import { Router } from 'express';
import passport from 'passport';

const router = Router();

router.get('/discord', passport.authenticate('discord'));

router.get(
  '/callback',
  passport.authenticate('discord', { failureRedirect: '/login?error=auth_failed' }),
  (req, res) => {
    const returnTo = req.session.returnTo ?? '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  },
);

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect('/');
  });
});

export default router;
