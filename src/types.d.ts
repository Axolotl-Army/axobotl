import type { Profile } from 'passport-discord';

declare global {
  namespace Express {
    // Discord profile is the serialized user shape stored in the session.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends Profile {}
  }
}

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}
