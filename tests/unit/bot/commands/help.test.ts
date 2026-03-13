import { describe, it, expect, vi } from 'vitest';
import { MessageFlags } from 'discord.js';
import { command } from '../../../../src/bot/commands/help';

describe('/help command', () => {
  it('has the correct name and description', () => {
    const json = command.data.toJSON();
    expect(json.name).toBe('help');
    expect(json.description).toBe('List all available commands');
  });

  describe('execute', () => {
    it('replies with the ephemeral flag set', async () => {
      const mockReply = vi.fn().mockResolvedValue(undefined);
      const interaction = { reply: mockReply };

      await command.execute(interaction as never);

      expect(mockReply).toHaveBeenCalledOnce();
      const callArg = mockReply.mock.calls[0][0] as { flags: unknown; embeds: unknown[] };
      expect(callArg.flags).toBe(MessageFlags.Ephemeral);
    });

    it('replies with exactly one embed', async () => {
      const mockReply = vi.fn().mockResolvedValue(undefined);
      const interaction = { reply: mockReply };

      await command.execute(interaction as never);

      const callArg = mockReply.mock.calls[0][0] as { embeds: unknown[] };
      expect(callArg.embeds).toHaveLength(1);
    });

    it('embed title is "Axobotl — Available Commands"', async () => {
      const mockReply = vi.fn().mockResolvedValue(undefined);
      const interaction = { reply: mockReply };

      await command.execute(interaction as never);

      const callArg = mockReply.mock.calls[0][0] as { embeds: Array<{ toJSON(): { title?: string } }> };
      const embedData = callArg.embeds[0].toJSON();
      expect(embedData.title).toBe('Axobotl \u2014 Available Commands');
    });

    it('embed contains the /ping field with correct value', async () => {
      const mockReply = vi.fn().mockResolvedValue(undefined);
      const interaction = { reply: mockReply };

      await command.execute(interaction as never);

      const callArg = mockReply.mock.calls[0][0] as {
        embeds: Array<{ toJSON(): { fields?: Array<{ name: string; value: string; inline?: boolean }> } }>;
      };
      const fields = callArg.embeds[0].toJSON().fields ?? [];
      const pingField = fields.find((f) => f.name === '/ping');
      expect(pingField).toBeDefined();
      expect(pingField?.value).toBe('Check bot latency');
      expect(pingField?.inline).toBe(true);
    });

    it('embed contains the /help field with correct value', async () => {
      const mockReply = vi.fn().mockResolvedValue(undefined);
      const interaction = { reply: mockReply };

      await command.execute(interaction as never);

      const callArg = mockReply.mock.calls[0][0] as {
        embeds: Array<{ toJSON(): { fields?: Array<{ name: string; value: string; inline?: boolean }> } }>;
      };
      const fields = callArg.embeds[0].toJSON().fields ?? [];
      const helpField = fields.find((f) => f.name === '/help');
      expect(helpField).toBeDefined();
      expect(helpField?.value).toBe('Show this help message');
      expect(helpField?.inline).toBe(true);
    });

    it('does not reply more than once', async () => {
      const mockReply = vi.fn().mockResolvedValue(undefined);
      const interaction = { reply: mockReply };

      await command.execute(interaction as never);

      expect(mockReply).toHaveBeenCalledOnce();
    });
  });
});
