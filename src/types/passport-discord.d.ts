declare module 'passport-discord' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface DiscordGuild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
  }

  export interface Profile {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    email?: string;
    guilds?: DiscordGuild[];
    locale?: string;
    mfa_enabled?: boolean;
    premium_type?: number;
    flags?: number;
  }

  interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope: string[];
    prompt?: string;
  }

  type DoneCallback = (err: Error | null, user?: Express.User | false) => void;

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: DoneCallback,
      ) => void,
    );
  }
}
