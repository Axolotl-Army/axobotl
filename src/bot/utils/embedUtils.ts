import { Guild } from '../../shared/models/Guild';

const DEFAULT_EMBED_COLOR = 0x5865F2; // Discord Blurple

/**
 * Returns the guild's configured embed colour as a number,
 * or the default (Blurple) if none is set or guild is not found.
 */
export async function getEmbedColor(guildId: string): Promise<number> {
  const guild = await Guild.findByPk(guildId, {
    attributes: ['embedColor'],
  });

  if (!guild?.embedColor) return DEFAULT_EMBED_COLOR;

  return parseInt(guild.embedColor.slice(1), 16);
}

export { DEFAULT_EMBED_COLOR };
