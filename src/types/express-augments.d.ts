import 'express-session';

// Extend express-session with returnTo for post-login redirect
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

// Extend Express.User with Discord profile fields
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      avatar: string | null;
      discriminator: string;
      guilds?: Array<{
        id: string;
        name: string;
        icon: string | null;
        owner: boolean;
        permissions: string;
        features: string[];
      }>;
    }
  }
}

export {};
