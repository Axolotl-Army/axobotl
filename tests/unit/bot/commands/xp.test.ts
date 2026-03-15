import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageFlags } from 'discord.js';
import { command } from '../../../../src/bot/commands/xp';

vi.mock('../../../../src/shared/models/UserLevel', () => ({
  UserLevel: {
    findOrCreate: vi.fn(),
  },
}));

vi.mock('../../../../src/shared/models/Guild', () => ({
  Guild: {
    findByPk: vi.fn(),
  },
}));

import { UserLevel } from '../../../../src/shared/models/UserLevel';
import { Guild } from '../../../../src/shared/models/Guild';

function mockRecord(xp = 0, level = 0) {
  return { xp, level, update: vi.fn().mockResolvedValue(undefined) };
}

function createInteraction(sub: string, amount: number, targetOverrides?: Partial<{ bot: boolean; id: string }>) {
  return {
    guildId: 'g1',
    guild: { name: 'Test Guild' },
    user: { id: '111' },
    options: {
      getSubcommand: vi.fn().mockReturnValue(sub),
      getUser: vi.fn().mockReturnValue({ id: '222', bot: false, ...targetOverrides }),
      getInteger: vi.fn().mockReturnValue(amount),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
  };
}

describe('/xp command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has the correct name and description', () => {
    const json = command.data.toJSON();
    expect(json.name).toBe('xp');
    expect(json.description).toContain('XP');
  });

  describe('execute - bot rejection', () => {
    it('rejects bots with ephemeral reply', async () => {
      const interaction = createInteraction('add', 100, { bot: true });
      await command.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith({
        content: 'Bots cannot earn XP.',
        flags: MessageFlags.Ephemeral,
      });
      expect(UserLevel.findOrCreate).not.toHaveBeenCalled();
    });
  });

  describe('execute - add subcommand', () => {
    it('adds XP and replies with embed', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      expect(record.update).toHaveBeenCalledWith(
        expect.objectContaining({ xp: expect.any(Number), level: expect.any(Number) }),
      );
      const embed = interaction.reply.mock.calls[0][0].embeds[0].toJSON();
      expect(embed.title).toBe('XP Updated');
    });

    it('sends level-up followUp when levels are gained', async () => {
      // Start at 0 XP, add enough to cross level 1 threshold
      const record = mockRecord(0, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);
      vi.mocked(Guild.findByPk).mockResolvedValue({ levelUpMessage: null } as never);

      const interaction = createInteraction('add', 500);
      await command.execute(interaction as never);

      expect(interaction.followUp).toHaveBeenCalled();
      const followUpContent = interaction.followUp.mock.calls[0][0].content as string;
      expect(followUpContent).toContain('<@222>');
    });
  });

  describe('execute - remove subcommand', () => {
    it('does not post level-up notification on remove', async () => {
      const record = mockRecord(500, 3);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, false]);

      const interaction = createInteraction('remove', 100);
      await command.execute(interaction as never);

      expect(interaction.followUp).not.toHaveBeenCalled();
    });
  });

  describe('execute - set subcommand', () => {
    it('sets XP to exact value', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, false]);

      const interaction = createInteraction('set', 1000);
      await command.execute(interaction as never);

      expect(record.update).toHaveBeenCalledWith(
        expect.objectContaining({ xp: 1000 }),
      );
    });
  });
});
