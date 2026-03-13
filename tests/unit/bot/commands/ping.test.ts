import { describe, it, expect, vi } from 'vitest';
import { command } from '../../../../src/bot/commands/ping';

describe('/ping command', () => {
  it('has the correct name and description', () => {
    const json = command.data.toJSON();
    expect(json.name).toBe('ping');
    expect(json.description).toBe('Check bot latency');
  });

  it('replies and edits with latency info', async () => {
    const mockReply = vi.fn().mockResolvedValue({
      resource: { message: { createdTimestamp: 1000 } },
    });
    const mockEditReply = vi.fn().mockResolvedValue(undefined);

    const interaction = {
      createdTimestamp: 950,
      client: { ws: { ping: 42 } },
      reply: mockReply,
      editReply: mockEditReply,
    };

    await command.execute(interaction as never);

    expect(mockReply).toHaveBeenCalledWith({ content: 'Pinging...', withResponse: true });
    expect(mockEditReply).toHaveBeenCalledWith(
      expect.stringContaining('50ms'),
    );
    expect(mockEditReply).toHaveBeenCalledWith(
      expect.stringContaining('42ms'),
    );
  });
});
