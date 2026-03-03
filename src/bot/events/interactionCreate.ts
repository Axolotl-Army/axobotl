import { Events, Interaction } from 'discord.js';
import type { BotEvent, SlashCommand } from '../types';
import { CommandLog } from '../../shared/models';

function createEvent(commands: Map<string, SlashCommand>): BotEvent {
  return {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction) {
      if (!interaction.isChatInputCommand()) return;

      const command = commands.get(interaction.commandName);
      if (!command) {
        console.error(`[Bot] No command matching /${interaction.commandName}`);
        return;
      }

      let successful = true;
      try {
        await command.execute(interaction);
      } catch (error) {
        successful = false;
        console.error(`[Bot] Error executing /${interaction.commandName}:`, error);
        const msg = { content: 'An error occurred while running this command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }

      // Log the command usage (fire-and-forget, non-blocking)
      if (interaction.guildId) {
        CommandLog.create({
          guildId: interaction.guildId,
          userId: interaction.user.id,
          username: interaction.user.tag,
          command: interaction.commandName,
          successful,
        }).catch((err: unknown) => {
          console.error('[Bot] Failed to log command:', err);
        });
      }
    },
  };
}

export default createEvent;
