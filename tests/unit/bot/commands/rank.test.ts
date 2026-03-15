import { describe, it, expect, vi, beforeEach } from 'vitest';
import { command } from '../../../../src/bot/commands/rank';

vi.mock('../../../../src/shared/models/UserLevel', () => ({
  UserLevel: {
    findOne: vi.fn(),
    count: vi.fn(),
  },
}));

import { UserLevel } from '../../../../src/shared/models/UserLevel';

function createInteraction(targetUser?: object) {
  const invoker = { id: '111', displayName: 'Invoker', displayAvatarURL: () => 'https://cdn.example.com/avatar.png' };
  return {
    user: invoker,
    guildId: 'g1',
    options: {
      getUser: vi.fn().mockReturnValue(targetUser ?? null),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('/rank command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has the correct name and description', () => {
    const json = command.data.toJSON();
    expect(json.name).toBe('rank');
    expect(json.description).toContain('level');
  });

  describe('execute', () => {
    it('defaults to the invoking user when no user option given', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      expect(UserLevel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guildId: 'g1', userId: '111' } }),
      );
    });

    it('looks up the specified user when provided', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const target = { id: '222', displayName: 'Target', displayAvatarURL: () => 'https://cdn.example.com/t.png' };
      const interaction = createInteraction(target);
      await command.execute(interaction as never);

      expect(UserLevel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guildId: 'g1', userId: '222' } }),
      );
    });

    it('shows "Not ranked yet" title for level 0 users', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const embed = interaction.reply.mock.calls[0][0].embeds[0].toJSON();
      expect(embed.title).toBe('Not ranked yet');
    });

    it('shows correct level title for ranked users', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue({ xp: 200 } as never);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const embed = interaction.reply.mock.calls[0][0].embeds[0].toJSON();
      expect(embed.title).toMatch(/^Level \d+$/);
    });

    it('shows guild rank based on count of users above', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue({ xp: 500 } as never);
      vi.mocked(UserLevel.count).mockResolvedValue(3);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const embed = interaction.reply.mock.calls[0][0].embeds[0].toJSON();
      const rankField = embed.fields.find((f: { name: string }) => f.name === 'Guild Rank');
      expect(rankField.value).toBe('#4');
    });
  });
});
