import { describe, it, expect, vi, beforeEach } from 'vitest';
import { command } from '../../../../src/bot/commands/rank';

vi.mock('../../../../src/shared/models/UserLevel', () => ({
  UserLevel: {
    findOne: vi.fn(),
    count: vi.fn(),
  },
}));

import { UserLevel } from '../../../../src/shared/models/UserLevel';

const IS_COMPONENTS_V2 = 32768;

function createInteraction(targetUser?: object) {
  const invoker = {
    id: '111',
    displayName: 'Invoker',
    displayAvatarURL: () => 'https://cdn.example.com/avatar.png',
  };
  return {
    user: invoker,
    guildId: 'g1',
    options: {
      getUser: vi.fn().mockReturnValue(targetUser ?? null),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

function getContainerJson(interaction: ReturnType<typeof createInteraction>) {
  const arg = interaction.reply.mock.calls[0][0] as { components: Array<{ toJSON(): unknown }> };
  return arg.components[0].toJSON() as {
    type: number;
    accent_color: number;
    components: Array<{
      type: number;
      content?: string;
      components?: Array<{ type: number; content: string }>;
    }>;
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

      const target = {
        id: '222',
        displayName: 'Target',
        displayAvatarURL: () => 'https://cdn.example.com/t.png',
      };
      const interaction = createInteraction(target);
      await command.execute(interaction as never);

      expect(UserLevel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guildId: 'g1', userId: '222' } }),
      );
    });

    it('sends IsComponentsV2 flag', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as { flags: number };
      expect(arg.flags).toBe(IS_COMPONENTS_V2);
    });

    it('does not send embeds', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.reply.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.embeds).toBeUndefined();
    });

    it('shows "Not ranked yet" for level 0 users', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      // Section (type 9) holds the title and level text
      const section = containerJson.components.find((c) => c.type === 9);
      expect(section).toBeDefined();
      const sectionTexts = (section!.components ?? [])
        .filter((c) => c.type === 10)
        .map((c) => c.content);
      expect(sectionTexts).toContain('Not ranked yet');
    });

    it('shows the user displayName as the heading in the section', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const section = containerJson.components.find((c) => c.type === 9);
      const sectionTexts = (section!.components ?? [])
        .filter((c) => c.type === 10)
        .map((c) => c.content);
      // Title is formatted as "# DisplayName"
      expect(sectionTexts.some((t) => t.includes('Invoker'))).toBe(true);
    });

    it('shows "Level N" text for ranked users', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue({ xp: 200 } as never);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const section = containerJson.components.find((c) => c.type === 9);
      const sectionTexts = (section!.components ?? [])
        .filter((c) => c.type === 10)
        .map((c) => c.content);
      expect(sectionTexts.some((t) => /^Level \d+$/.test(t))).toBe(true);
    });

    it('shows guild rank derived from count of users above', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue({ xp: 500 } as never);
      vi.mocked(UserLevel.count).mockResolvedValue(3);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      // TextDisplays after the separator contain rank/XP/progress info
      const allTextContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allTextContent).toContain('#4');
    });

    it('shows total XP in a TextDisplay', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue({ xp: 1500 } as never);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const allTextContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allTextContent).toContain('Total XP');
      expect(allTextContent).toContain('1,500');
    });

    it('shows progress toward next level in a TextDisplay', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue({ xp: 200 } as never);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      const containerJson = getContainerJson(interaction);
      const allTextContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');
      expect(allTextContent).toContain('Progress');
    });

    it('replies exactly once', async () => {
      vi.mocked(UserLevel.findOne).mockResolvedValue(null);
      vi.mocked(UserLevel.count).mockResolvedValue(0);

      const interaction = createInteraction();
      await command.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledOnce();
    });
  });
});
