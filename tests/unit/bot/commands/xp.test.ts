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

// MessageFlags.IsComponentsV2 (32768) | MessageFlags.Ephemeral (64) = 32832
const FLAGS_COMPONENTS_V2_EPHEMERAL = 32832;

function mockRecord(xp = 0, level = 0) {
  return { xp, level, update: vi.fn().mockResolvedValue(undefined) };
}

function createInteraction(
  sub: string,
  amount: number,
  targetOverrides?: Partial<{ bot: boolean; id: string }>,
) {
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

function getContainerJson(interaction: ReturnType<typeof createInteraction>) {
  const arg = interaction.reply.mock.calls[0][0] as { components: Array<{ toJSON(): unknown }> };
  return arg.components[0].toJSON() as {
    type: number;
    accent_color: number;
    components: Array<{ type: number; content: string }>;
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
    it('rejects bots with plain ephemeral content reply', async () => {
      const interaction = createInteraction('add', 100, { bot: true });
      await command.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith({
        content: 'Bots cannot earn XP.',
        flags: MessageFlags.Ephemeral,
      });
      expect(UserLevel.findOrCreate).not.toHaveBeenCalled();
    });

    it('does not proceed to update XP when target is a bot', async () => {
      const interaction = createInteraction('add', 100, { bot: true });
      await command.execute(interaction as never);

      expect(UserLevel.findOrCreate).not.toHaveBeenCalled();
    });
  });

  describe('execute - add subcommand', () => {
    it('calls findOrCreate for the target user', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      expect(UserLevel.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guildId: 'g1', userId: '222' } }),
      );
    });

    it('updates record with new XP after adding', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      expect(record.update).toHaveBeenCalledWith(
        expect.objectContaining({ xp: expect.any(Number), level: expect.any(Number) }),
      );
      const updateArg = record.update.mock.calls[0][0] as { xp: number };
      expect(updateArg.xp).toBe(150);
    });

    it('sends IsComponentsV2 | Ephemeral flags', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as { flags: number };
      expect(arg.flags).toBe(FLAGS_COMPONENTS_V2_EPHEMERAL);
    });

    it('does not send embeds', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.embeds).toBeUndefined();
    });

    it('container title TextDisplay reads "# XP Updated"', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const titleDisplay = containerJson.components[0];
      expect(titleDisplay.type).toBe(10);
      expect(titleDisplay.content).toBe('# XP Updated');
    });

    it('container shows new XP value in a TextDisplay', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allContent).toContain('New XP');
      expect(allContent).toContain('150');
    });

    it('container mentions the target user', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allContent).toContain('<@222>');
    });

    it('container uses green accent color (0x57f287)', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, true]);

      const interaction = createInteraction('add', 100);
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      expect(containerJson.accent_color).toBe(0x57f287);
    });

    it('sends level-up followUp when levels are gained', async () => {
      // 0 XP + 500 XP crosses level 1 threshold
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

    it('reduces XP by the specified amount', async () => {
      const record = mockRecord(500, 3);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, false]);

      const interaction = createInteraction('remove', 100);
      await command.execute(interaction as never);

      const updateArg = record.update.mock.calls[0][0] as { xp: number };
      expect(updateArg.xp).toBe(400);
    });
  });

  describe('execute - set subcommand', () => {
    it('sets XP to the exact value provided', async () => {
      const record = mockRecord(50, 0);
      vi.mocked(UserLevel.findOrCreate).mockResolvedValue([record as never, false]);

      const interaction = createInteraction('set', 1000);
      await command.execute(interaction as never);

      const updateArg = record.update.mock.calls[0][0] as { xp: number };
      expect(updateArg.xp).toBe(1000);
    });
  });
});
