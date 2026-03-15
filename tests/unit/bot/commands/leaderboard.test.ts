import { describe, it, expect, vi, beforeEach } from 'vitest';
import { command } from '../../../../src/bot/commands/leaderboard';

vi.mock('../../../../src/shared/models/UserLevel', () => ({
  UserLevel: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    count: vi.fn(),
  },
}));

import { UserLevel } from '../../../../src/shared/models/UserLevel';

function createInteraction(userId = '111') {
  return {
    guildId: 'g1',
    user: { id: userId },
    guild: {
      members: {
        cache: {
          get: vi.fn().mockReturnValue(undefined),
        },
        fetch: vi.fn().mockRejectedValue(new Error('not found')),
      },
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

function mockRecord(userId: string, xp: number, level: number) {
  return { userId, xp, level };
}

describe('/leaderboard command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has the correct name and description', () => {
    const json = command.data.toJSON();
    expect(json.name).toBe('leaderboard');
    expect(json.description).toContain('top');
  });

  describe('execute', () => {
    it('defers the reply before processing', async () => {
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      expect(interaction.deferReply).toHaveBeenCalledOnce();
    });

    it('shows "no XP" message when no records exist', async () => {
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      expect(interaction.editReply).toHaveBeenCalledWith(
        'No one has earned any XP in this server yet.',
      );
    });

    it('builds leaderboard from top records', async () => {
      const records = [
        mockRecord('u1', 500, 3),
        mockRecord('u2', 300, 2),
      ];
      vi.mocked(UserLevel.findAll).mockResolvedValue(records as never);

      const interaction = createInteraction('u1');
      interaction.guild.members.cache.get.mockImplementation((id: string) => {
        if (id === 'u1') return { displayName: 'Alice' };
        if (id === 'u2') return { displayName: 'Bob' };
        return undefined;
      });

      await command.execute(interaction as never);

      const call = interaction.editReply.mock.calls[0][0];
      const embed = call.embeds[0].toJSON();
      expect(embed.description).toContain('Alice');
      expect(embed.description).toContain('Bob');
      expect(embed.title).toContain('Top 2');
    });

    it('falls back to mention when member fetch fails', async () => {
      const records = [mockRecord('u1', 500, 3)];
      vi.mocked(UserLevel.findAll).mockResolvedValue(records as never);

      const interaction = createInteraction('other');
      // cache miss + fetch failure → fallback to <@u1>
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      await command.execute(interaction as never);

      const embed = interaction.editReply.mock.calls[0][0].embeds[0].toJSON();
      expect(embed.description).toContain('<@u1>');
    });

    it('shows invoking user rank in footer when outside top 10', async () => {
      const records = [mockRecord('u1', 500, 3)];
      vi.mocked(UserLevel.findAll).mockResolvedValue(records as never);
      vi.mocked(UserLevel.findOne).mockResolvedValue({ xp: 50, level: 1, userId: '111' } as never);
      vi.mocked(UserLevel.count).mockResolvedValue(5);

      const interaction = createInteraction('111');
      await command.execute(interaction as never);

      const embed = interaction.editReply.mock.calls[0][0].embeds[0].toJSON();
      expect(embed.description).toContain('Your rank');
      expect(embed.description).toContain('#6');
    });

    it('does not show footer rank when invoking user is in top results', async () => {
      const records = [mockRecord('111', 500, 3)];
      vi.mocked(UserLevel.findAll).mockResolvedValue(records as never);

      const interaction = createInteraction('111');
      interaction.guild.members.cache.get.mockReturnValue({ displayName: 'Me' });

      await command.execute(interaction as never);

      const embed = interaction.editReply.mock.calls[0][0].embeds[0].toJSON();
      expect(embed.description).not.toContain('Your rank');
    });

    it('does not show footer rank when invoking user has no XP', async () => {
      const records = [mockRecord('u1', 500, 3)];
      vi.mocked(UserLevel.findAll).mockResolvedValue(records as never);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction('111');
      await command.execute(interaction as never);

      const embed = interaction.editReply.mock.calls[0][0].embeds[0].toJSON();
      expect(embed.description).not.toContain('Your rank');
    });
  });
});
