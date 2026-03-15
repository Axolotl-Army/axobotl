import { describe, it, expect, vi, beforeEach } from 'vitest';
import { command } from '../../../../src/bot/commands/levelconfig';

vi.mock('../../../../src/shared/models/Guild', () => ({
  Guild: {
    upsert: vi.fn().mockResolvedValue([{}, true]),
  },
}));

import { Guild } from '../../../../src/shared/models/Guild';

// MessageFlags.IsComponentsV2 (32768) | MessageFlags.Ephemeral (64) = 32832
const FLAGS_COMPONENTS_V2_EPHEMERAL = 32832;

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

function getContainerJson(interaction: ReturnType<typeof createInteraction>) {
  const arg = interaction.reply.mock.calls[0][0] as { components: Array<{ toJSON(): unknown }> };
  return arg.components[0].toJSON() as {
    type: number;
    accent_color: number;
    components: Array<{ type: number; content: string }>;
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
    it('upserts with the trimmed custom template', async () => {
      const interaction = createInteraction('GG {user}! Level {level}!');
      await command.execute(interaction as never);

      expect(Guild.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'g1', levelUpMessage: 'GG {user}! Level {level}!' }),
      );
    });

    it('trims whitespace from the template before upserting', async () => {
      const interaction = createInteraction('  GG {user}!  ');
      await command.execute(interaction as never);

      expect(Guild.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ levelUpMessage: 'GG {user}!' }),
      );
    });

    it('sends IsComponentsV2 | Ephemeral flags', async () => {
      const interaction = createInteraction('Hello {user}');
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as { flags: number };
      expect(arg.flags).toBe(FLAGS_COMPONENTS_V2_EPHEMERAL);
    });

    it('does not send embeds or plain content', async () => {
      const interaction = createInteraction('Hello {user}');
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.embeds).toBeUndefined();
      expect(arg.content).toBeUndefined();
    });

    it('container is type 17 with green accent color', async () => {
      const interaction = createInteraction('Hello {user}');
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      expect(containerJson.type).toBe(17);
      expect(containerJson.accent_color).toBe(0x57f287);
    });

    it('container title reads "# Level-Up Message Updated" for a custom template', async () => {
      const interaction = createInteraction('GG {user}! Level {level}!');
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const titleDisplay = containerJson.components[0];
      expect(titleDisplay.type).toBe(10);
      expect(titleDisplay.content).toBe('# Level-Up Message Updated');
    });

    it('container preview TextDisplay contains rendered preview with user mention', async () => {
      const interaction = createInteraction('GG {user}! Level {level}!');
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      // formatLevelUpMessage renders {user} → <@111> and {level} → 5
      expect(allContent).toContain('Preview');
      expect(allContent).toContain('GG <@111>! Level 5!');
    });

    it('resets to null when "reset" keyword is provided', async () => {
      const interaction = createInteraction('reset');
      await command.execute(interaction as never);

      expect(Guild.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ levelUpMessage: null }),
      );
    });

    it('reset is case-insensitive', async () => {
      const interaction = createInteraction('RESET');
      await command.execute(interaction as never);

      expect(Guild.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ levelUpMessage: null }),
      );
    });

    it('container title reads "# Level-Up Message Reset" when reset', async () => {
      const interaction = createInteraction('reset');
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const titleDisplay = containerJson.components[0];
      expect(titleDisplay.type).toBe(10);
      expect(titleDisplay.content).toBe('# Level-Up Message Reset');
    });

    it('container preview TextDisplay uses default template after reset', async () => {
      const interaction = createInteraction('reset');
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      // Default template: "GG {user}, you reached **level {level}**!"
      expect(allContent).toContain('<@111>');
      expect(allContent).toContain('level 5');
    });

    it('replies exactly once', async () => {
      const interaction = createInteraction('Hello {user}');
      await command.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledOnce();
    });
  });
});
