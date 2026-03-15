import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/shared/models/GuildPlugin', () => ({
  GuildPlugin: { findAll: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../../src/shared/models', () => ({
  Guild: { findByPk: vi.fn().mockResolvedValue(null) },
  CommandLog: {},
  UserLevel: {},
  GuildPlugin: { findAll: vi.fn().mockResolvedValue([]) },
  LevelRole: {},
}));

vi.mock('../../../../src/bot/plugins', () => ({
  pluginCache: {
    isEnabled: vi.fn().mockResolvedValue(true),
  },
  getAllPlugins: vi.fn().mockReturnValue([
    {
      id: 'leveling',
      name: 'Leveling',
      description: 'Track XP from messages, level up, and earn role rewards',
      commands: [],
      defaultConfig: {},
    },
  ]),
}));

import { command } from '../../../../src/bot/commands/help';

// MessageFlags.IsComponentsV2 (32768) | MessageFlags.Ephemeral (64) = 32832
const FLAGS_COMPONENTS_V2_EPHEMERAL = 32832;

// discord.js ComponentType values
const TYPE_CONTAINER = 17;
const TYPE_TEXT_DISPLAY = 10;
const TYPE_SEPARATOR = 14;

type AnyBuilder = {
  data: Record<string, unknown>;
  components?: AnyBuilder[];
};

function createInteraction(guildId?: string) {
  return {
    guildId: guildId ?? null,
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

function getContainerBuilder(interaction: ReturnType<typeof createInteraction>): AnyBuilder {
  const arg = interaction.reply.mock.calls[0][0] as { components: AnyBuilder[] };
  return arg.components[0];
}

describe('/help command', () => {
  it('has the correct name and description', () => {
    const json = command.data.toJSON();
    expect(json.name).toBe('help');
    expect(json.description).toBe('List all available commands');
  });

  describe('execute', () => {
    it('replies exactly once', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledOnce();
    });

    it('sends IsComponentsV2 and Ephemeral flags combined', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as { flags: number };
      expect(arg.flags).toBe(FLAGS_COMPONENTS_V2_EPHEMERAL);
    });

    it('includes exactly one top-level component (container)', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as { components: unknown[] };
      expect(arg.components).toHaveLength(1);
    });

    it('does not send embeds', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.embeds).toBeUndefined();
    });

    it('container is type 17 (Container) with correct accent color', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      expect(container.data.type).toBe(TYPE_CONTAINER);
      expect(container.data.accent_color).toBe(0x5865f2);
    });

    it('container first child is a TextDisplay containing the title', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const firstChild = container.components![0];
      expect(firstChild.data.type).toBe(TYPE_TEXT_DISPLAY);
      expect(firstChild.data.content).toContain('Axobotl');
      expect(firstChild.data.content).toContain('Commands');
    });

    it('container second child is a Separator', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const secondChild = container.components![1];
      expect(secondChild.data.type).toBe(TYPE_SEPARATOR);
    });

    it('contains a text display for /ping with its description', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const textDisplays = container.components!.filter((c) => c.data.type === TYPE_TEXT_DISPLAY);
      const allText = textDisplays.map((c) => c.data.content as string).join('\n');

      expect(allText).toContain('/ping');
      expect(allText).toContain('Check bot latency');
    });

    it('contains a text display for /help with its description', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const textDisplays = container.components!.filter((c) => c.data.type === TYPE_TEXT_DISPLAY);
      const allText = textDisplays.map((c) => c.data.content as string).join('\n');

      expect(allText).toContain('/help');
      expect(allText).toContain('Show this help message');
    });

    it('shows only base commands (3) when no guildId is present', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const commandTexts = container.components!.filter(
        (c) => c.data.type === TYPE_TEXT_DISPLAY && !(c.data.content as string).startsWith('#'),
      );
      expect(commandTexts).toHaveLength(3);
    });

    it('shows base + plugin commands (5) when guildId present and leveling enabled', async () => {
      const interaction = createInteraction('guild123');
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const commandTexts = container.components!.filter(
        (c) => c.data.type === TYPE_TEXT_DISPLAY && !(c.data.content as string).startsWith('#'),
      );
      expect(commandTexts).toHaveLength(5);
    });

    it('does not include admin commands /xp and /levelconfig', async () => {
      const interaction = createInteraction('guild123');
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const allText = container.components!
        .filter((c) => c.data.type === TYPE_TEXT_DISPLAY)
        .map((c) => c.data.content as string)
        .join('\n');

      expect(allText).not.toContain('/xp');
      expect(allText).not.toContain('/levelconfig');
    });
  });
});
