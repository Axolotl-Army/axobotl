import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageFlags } from 'discord.js';
import { command } from '../../../../src/bot/commands/levelconfig';

vi.mock('../../../../src/shared/models/Guild', () => ({
  Guild: {
    upsert: vi.fn().mockResolvedValue([{}, true]),
  },
}));

import { Guild } from '../../../../src/shared/models/Guild';

function createInteraction(message: string) {
  return {
    guildId: 'g1',
    guild: { name: 'Test Guild' },
    user: { id: '111' },
    options: {
      getString: vi.fn().mockReturnValue(message),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('/levelconfig command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has the correct name and description', () => {
    const json = command.data.toJSON();
    expect(json.name).toBe('levelconfig');
    expect(json.description).toContain('leveling');
  });

  describe('execute - setmessage', () => {
    it('upserts custom template and replies with preview', async () => {
      const interaction = createInteraction('GG {user}! Level {level}!');
      await command.execute(interaction as never);

      expect(Guild.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'g1', levelUpMessage: 'GG {user}! Level {level}!' }),
      );
      const content = interaction.reply.mock.calls[0][0].content as string;
      expect(content).toContain('Level-up message updated.');
      expect(content).toContain('GG <@111>! Level 5!');
    });

    it('resets to default when "reset" is provided', async () => {
      const interaction = createInteraction('reset');
      await command.execute(interaction as never);

      expect(Guild.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ levelUpMessage: null }),
      );
      const content = interaction.reply.mock.calls[0][0].content as string;
      expect(content).toContain('Level-up message reset to default.');
    });

    it('reset is case-insensitive', async () => {
      const interaction = createInteraction('RESET');
      await command.execute(interaction as never);

      expect(Guild.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ levelUpMessage: null }),
      );
    });

    it('trims whitespace from the template', async () => {
      const interaction = createInteraction('  GG {user}!  ');
      await command.execute(interaction as never);

      expect(Guild.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ levelUpMessage: 'GG {user}!' }),
      );
    });

    it('replies with ephemeral flag', async () => {
      const interaction = createInteraction('test {user}');
      await command.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ flags: MessageFlags.Ephemeral }),
      );
    });
  });
});
