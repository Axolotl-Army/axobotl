import type { SlashCommand } from '../types';

export interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  commands: SlashCommand[];
  defaultConfig: Record<string, unknown>;
}

const pluginRegistry = new Map<string, PluginDefinition>();

export function registerPlugin(plugin: PluginDefinition): void {
  pluginRegistry.set(plugin.id, plugin);
}

export function getPlugin(id: string): PluginDefinition | undefined {
  return pluginRegistry.get(id);
}

export function getAllPlugins(): PluginDefinition[] {
  return [...pluginRegistry.values()];
}

export function getPluginForCommand(commandName: string): PluginDefinition | undefined {
  for (const plugin of pluginRegistry.values()) {
    if (plugin.commands.some((cmd) => cmd.data.name === commandName)) {
      return plugin;
    }
  }
  return undefined;
}

export { pluginRegistry };
