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

const IS_COMPONENTS_V2 = 32768;

function makeCollector() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    on: vi.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
      return undefined;
    }),
    _trigger: (event: string, ...args: unknown[]) => {
      handlers[event]?.(...args);
    },
  };
}

function createInteraction(userId = '111') {
  const collector = makeCollector();
  const mockMessage = {
    createMessageComponentCollector: vi.fn().mockReturnValue(collector),
  };
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
    reply: vi.fn().mockResolvedValue({
      resource: { message: mockMessage },
    }),
    editReply: vi.fn().mockResolvedValue(undefined),
    _collector: collector,
    _message: mockMessage,
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
    it('calls reply (not deferReply) with withResponse: true', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledOnce();
      const arg = interaction.reply.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.withResponse).toBe(true);
    });

    it('sends IsComponentsV2 flag', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as { flags: number };
      expect(arg.flags).toBe(IS_COMPONENTS_V2);
    });

    it('does not send embeds', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.embeds).toBeUndefined();
    });

    it('includes container (type 17) as first component', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const firstJson = arg.components[0].toJSON() as { type: number };
      expect(firstJson.type).toBe(17);
    });

    it('shows "XP Leaderboard" title in the container', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const containerJson = arg.components[0].toJSON() as {
        components: Array<{ type: number; content: string }>;
      };
      const titleDisplay = containerJson.components[0];
      expect(titleDisplay.type).toBe(10);
      expect(titleDisplay.content).toBe('# XP Leaderboard');
    });

    it('shows "no XP" message when no records exist', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const containerJson = arg.components[0].toJSON() as {
        components: Array<{ type: number; content: string }>;
      };
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allContent).toContain('No one has earned any XP');
    });

    it('includes ranked entries when records exist', async () => {
      const records = [mockRecord('u1', 500, 3), mockRecord('u2', 300, 2)];
      vi.mocked(UserLevel.count).mockResolvedValue(2);
      vi.mocked(UserLevel.findAll).mockResolvedValue(records as never);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction('u1');
      interaction.guild.members.cache.get.mockImplementation((id: string) => {
        if (id === 'u1') return { displayName: 'Alice' };
        if (id === 'u2') return { displayName: 'Bob' };
        return undefined;
      });

      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const containerJson = arg.components[0].toJSON() as {
        components: Array<{ type: number; content: string }>;
      };
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allContent).toContain('Alice');
      expect(allContent).toContain('Bob');
    });

    it('formats entries with rank number, level, and XP', async () => {
      const records = [mockRecord('u1', 1500, 5)];
      vi.mocked(UserLevel.count).mockResolvedValue(1);
      vi.mocked(UserLevel.findAll).mockResolvedValue(records as never);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction('other');
      interaction.guild.members.cache.get.mockImplementation((id: string) =>
        id === 'u1' ? { displayName: 'Alice' } : undefined,
      );

      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const containerJson = arg.components[0].toJSON() as {
        components: Array<{ type: number; content: string }>;
      };
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      // Entry line: "**1.** Alice -- Level 5 (1,500 XP)"
      expect(allContent).toContain('**1.**');
      expect(allContent).toContain('Level 5');
      expect(allContent).toContain('1,500 XP');
    });

    it('falls back to mention when member fetch fails', async () => {
      const records = [mockRecord('u1', 500, 3)];
      vi.mocked(UserLevel.count).mockResolvedValue(1);
      vi.mocked(UserLevel.findAll).mockResolvedValue(records as never);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction('other');
      // cache miss and fetch will reject (already set in createInteraction)

      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const containerJson = arg.components[0].toJSON() as {
        components: Array<{ type: number; content: string }>;
      };
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allContent).toContain('<@u1>');
    });

    it('includes an ActionRow (type 1) as the second top-level component', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      expect(arg.components).toHaveLength(2);
      const actionRowJson = arg.components[1].toJSON() as { type: number };
      expect(actionRowJson.type).toBe(1);
    });

    it('pagination ActionRow contains exactly 5 buttons', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const actionRowJson = arg.components[1].toJSON() as {
        type: number;
        components: Array<{ type: number }>;
      };
      // Type 2 = Button
      const buttons = actionRowJson.components.filter((c) => c.type === 2);
      expect(buttons).toHaveLength(5);
    });

    it('My Rank button is disabled when invoking user has no XP', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction('111');
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const actionRowJson = arg.components[1].toJSON() as {
        components: Array<{ label: string; disabled: boolean }>;
      };
      const myRankBtn = actionRowJson.components.find((c) => c.label === 'My Rank');
      expect(myRankBtn).toBeDefined();
      expect(myRankBtn!.disabled).toBe(true);
    });

    it('My Rank button is enabled when invoking user has XP', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(1);
      vi.mocked(UserLevel.findAll).mockResolvedValue([mockRecord('111', 500, 3)] as never);
      vi.mocked(UserLevel.findOne).mockResolvedValue({ xp: 500, userId: '111' } as never);

      const interaction = createInteraction('111');
      interaction.guild.members.cache.get.mockReturnValue({ displayName: 'Me' });

      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const actionRowJson = arg.components[1].toJSON() as {
        components: Array<{ label: string; disabled: boolean }>;
      };
      const myRankBtn = actionRowJson.components.find((c) => c.label === 'My Rank');
      expect(myRankBtn).toBeDefined();
      expect(myRankBtn!.disabled).toBe(false);
    });

    it('creates a message component collector from the reply resource', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      expect(interaction._message.createMessageComponentCollector).toHaveBeenCalledOnce();
    });

    it('registers collect and end handlers on the collector', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const onCalls = interaction._collector.on.mock.calls.map(
        (c: unknown[]) => c[0] as string,
      );
      expect(onCalls).toContain('collect');
      expect(onCalls).toContain('end');
    });

    it('shows page footer TextDisplay in the container', async () => {
      vi.mocked(UserLevel.count).mockResolvedValue(0);
      vi.mocked(UserLevel.findAll).mockResolvedValue([]);
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as {
        components: Array<{ toJSON(): unknown }>;
      };
      const containerJson = arg.components[0].toJSON() as {
        components: Array<{ type: number; content: string }>;
      };
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allContent).toContain('Page 1 of 1');
    });
  });
});
