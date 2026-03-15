import { describe, it, expect, vi } from 'vitest';
import { MessageFlags } from 'discord.js';
import { command } from '../../../../src/bot/commands/ping';

const IS_COMPONENTS_V2 = 32768; // MessageFlags.IsComponentsV2

function createInteraction() {
  return {
    client: { ws: { ping: 42 } },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('/ping command', () => {
  it('has the correct name and description', () => {
    const json = command.data.toJSON();
    expect(json.name).toBe('ping');
    expect(json.description).toBe('Check bot latency');
  });

  describe('execute', () => {
    it('calls deferReply before editReply', async () => {
      const interaction = createInteraction();
      const callOrder: string[] = [];
      interaction.deferReply.mockImplementation(() => {
        callOrder.push('deferReply');
        return Promise.resolve(undefined);
      });
      interaction.editReply.mockImplementation(() => {
        callOrder.push('editReply');
        return Promise.resolve(undefined);
      });

      await command.execute(interaction as never);

      expect(callOrder).toEqual(['deferReply', 'editReply']);
    });

    it('never calls reply — only deferReply and editReply', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      expect(interaction.deferReply).toHaveBeenCalledOnce();
      expect(interaction.editReply).toHaveBeenCalledOnce();
    });

    it('sends IsComponentsV2 flag in editReply', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.editReply.mock.calls[0][0] as { flags: number; components: unknown[] };
      expect(arg.flags).toBe(IS_COMPONENTS_V2);
    });

    it('includes exactly one top-level component (container) in editReply', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.editReply.mock.calls[0][0] as { flags: number; components: unknown[] };
      expect(arg.components).toHaveLength(1);
    });

    it('container title is "Pong!"', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.editReply.mock.calls[0][0] as { components: Array<{ toJSON(): unknown }> };
      const containerJson = arg.components[0].toJSON() as {
        type: number;
        components: Array<{ type: number; content: string }>;
      };
      // Type 17 = ComponentType.Container
      expect(containerJson.type).toBe(17);
      // First child is a TextDisplay (type 10) with the "# Pong!" title
      const titleDisplay = containerJson.components[0];
      expect(titleDisplay.type).toBe(10);
      expect(titleDisplay.content).toBe('# Pong!');
    });

    it('container includes bot latency value in a TextDisplay', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.editReply.mock.calls[0][0] as { components: Array<{ toJSON(): unknown }> };
      const containerJson = arg.components[0].toJSON() as {
        components: Array<{ type: number; content: string }>;
      };
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');

      expect(allContent).toContain('Bot latency');
      expect(allContent).toMatch(/\d+ms/);
    });

    it('container includes API latency from ws.ping', async () => {
      const interaction = createInteraction();
      await command.execute(interaction as never);

      const arg = interaction.editReply.mock.calls[0][0] as { components: Array<{ toJSON(): unknown }> };
      const containerJson = arg.components[0].toJSON() as {
        components: Array<{ type: number; content: string }>;
      };
      const allContent = containerJson.components
        .filter((c) => c.type === 10)
        .map((c) => c.content)
        .join('\n');

      expect(allContent).toContain('API latency');
      expect(allContent).toContain('42ms');
    });
  });
});
