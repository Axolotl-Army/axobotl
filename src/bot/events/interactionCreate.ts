import { Events, Interaction, MessageFlags } from 'discord.js';
import type { BotEvent, SlashCommand } from '../types';
import { CommandLog } from '../../shared/models';
import { pluginCache, getPluginForCommand } from '../plugins';

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

      // Check if this command belongs to a plugin and if it's enabled
      const plugin = getPluginForCommand(interaction.commandName);
      if (plugin && interaction.guildId) {
        const enabled = await pluginCache.isEnabled(interaction.guildId, plugin.id);
        if (!enabled) {
          await interaction.reply({
            content: 'This feature is not enabled in this server.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      let successful = true;
      try {
        await command.execute(interaction);
      } catch (error) {
        successful = false;
        console.error(`[Bot] Error executing /${interaction.commandName}:`, error);
        const content = 'An error occurred while running this command.';
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral });
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
