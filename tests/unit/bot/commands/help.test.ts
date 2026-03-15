import { describe, it, expect, vi } from 'vitest';
import { command } from '../../../../src/bot/commands/help';

// MessageFlags.IsComponentsV2 (32768) | MessageFlags.Ephemeral (64) = 32832
const FLAGS_COMPONENTS_V2_EPHEMERAL = 32832;

// discord.js ComponentType values
const TYPE_CONTAINER = 17;
const TYPE_TEXT_DISPLAY = 10;
const TYPE_SEPARATOR = 14;
const TYPE_SECTION = 9;

type AnyBuilder = {
  data: Record<string, unknown>;
  components?: AnyBuilder[];
  accessory?: AnyBuilder;
};

function createInteraction() {
  return { reply: vi.fn().mockResolvedValue(undefined) };
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

    it('container includes a section for /ping with its description', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const sections = container.components!.filter((c) => c.data.type === TYPE_SECTION);
      const allSectionText = sections
        .flatMap((s) => s.components ?? [])
        .filter((c) => c.data.type === TYPE_TEXT_DISPLAY)
        .map((c) => c.data.content as string)
        .join('\n');

      expect(allSectionText).toContain('/ping');
      expect(allSectionText).toContain('Check bot latency');
    });

    it('container includes a section for /help with its description', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const sections = container.components!.filter((c) => c.data.type === TYPE_SECTION);
      const allSectionText = sections
        .flatMap((s) => s.components ?? [])
        .filter((c) => c.data.type === TYPE_TEXT_DISPLAY)
        .map((c) => c.data.content as string)
        .join('\n');

      expect(allSectionText).toContain('/help');
      expect(allSectionText).toContain('Show this help message');
    });

    it('container includes sections for all 6 commands', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const container = getContainerBuilder(interaction);
      const sections = container.components!.filter((c) => c.data.type === TYPE_SECTION);
      expect(sections).toHaveLength(6);
    });
  });
});
