import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerPlugin,
  getPlugin,
  getAllPlugins,
  getPluginForCommand,
  pluginRegistry,
} from '../../../../src/bot/plugins/registry';
import type { PluginDefinition } from '../../../../src/bot/plugins/registry';
import type { SlashCommand } from '../../../../src/bot/types';

// Construct minimal SlashCommand stubs that satisfy the interface without
// importing discord.js builders (which require network/env setup).
function makeCommand(name: string): SlashCommand {
  return {
    data: { name } as SlashCommand['data'],
    execute: async () => {},
  };
}

function makePlugin(id: string, commandNames: string[] = []): PluginDefinition {
  return {
    id,
    name: `Plugin ${id}`,
    description: `Description for ${id}`,
    commands: commandNames.map(makeCommand),
    defaultConfig: {},
  };
}

describe('Plugin Registry', () => {
  // Isolate each test by clearing the shared module-level map
  beforeEach(() => {
    pluginRegistry.clear();
  });

  describe('registerPlugin()', () => {
    it('stores a plugin so it can be retrieved by ID', () => {
      const plugin = makePlugin('leveling');
      registerPlugin(plugin);

      expect(getPlugin('leveling')).toBe(plugin);
    });

    it('overwrites an existing registration when the same ID is registered again', () => {
      const original = makePlugin('leveling');
      const replacement = { ...makePlugin('leveling'), name: 'Leveling V2' };

      registerPlugin(original);
      registerPlugin(replacement);

      expect(getPlugin('leveling')!.name).toBe('Leveling V2');
    });

    it('stores multiple independent plugins without interference', () => {
      registerPlugin(makePlugin('leveling'));
      registerPlugin(makePlugin('moderation'));

      expect(getPlugin('leveling')).toBeDefined();
      expect(getPlugin('moderation')).toBeDefined();
    });
  });

  describe('getPlugin()', () => {
    it('returns undefined for an ID that was never registered', () => {
      expect(getPlugin('nonexistent-plugin')).toBeUndefined();
    });

    it('returns the exact plugin object that was registered', () => {
      const plugin = makePlugin('welcome', ['/welcome']);
      registerPlugin(plugin);

      expect(getPlugin('welcome')).toStrictEqual(plugin);
    });
  });

  describe('getAllPlugins()', () => {
    it('returns an empty array when no plugins are registered', () => {
      expect(getAllPlugins()).toEqual([]);
    });

    it('returns all registered plugins', () => {
      registerPlugin(makePlugin('leveling'));
      registerPlugin(makePlugin('moderation'));

      const all = getAllPlugins();

      expect(all).toHaveLength(2);
      expect(all.map((p) => p.id)).toContain('leveling');
      expect(all.map((p) => p.id)).toContain('moderation');
    });

    it('returns a snapshot — mutations to the returned array do not affect the registry', () => {
      registerPlugin(makePlugin('leveling'));

      const snapshot = getAllPlugins();
      snapshot.push(makePlugin('injected'));

      expect(getAllPlugins()).toHaveLength(1);
    });
  });

  describe('getPluginForCommand()', () => {
    it('returns undefined when no plugins are registered', () => {
      expect(getPluginForCommand('rank')).toBeUndefined();
    });

    it('returns undefined when no plugin owns the given command name', () => {
      registerPlugin(makePlugin('leveling', ['rank', 'leaderboard']));

      expect(getPluginForCommand('ban')).toBeUndefined();
    });

    it('returns the plugin that owns the given command', () => {
      const leveling = makePlugin('leveling', ['rank', 'leaderboard', 'xp']);
      registerPlugin(leveling);

      const found = getPluginForCommand('rank');

      expect(found).toBe(leveling);
    });

    it('matches the correct plugin when multiple plugins each have commands', () => {
      registerPlugin(makePlugin('leveling', ['rank', 'leaderboard']));
      registerPlugin(makePlugin('moderation', ['ban', 'kick', 'warn']));

      expect(getPluginForCommand('ban')?.id).toBe('moderation');
      expect(getPluginForCommand('rank')?.id).toBe('leveling');
    });

    it('returns the owning plugin when it has a single command', () => {
      registerPlugin(makePlugin('ping', ['ping']));

      expect(getPluginForCommand('ping')?.id).toBe('ping');
    });

    it('does not match a command that is a substring of another command name', () => {
      registerPlugin(makePlugin('leveling', ['leaderboard']));

      // 'leader' is not a registered command name even though it appears inside 'leaderboard'
      expect(getPluginForCommand('leader')).toBeUndefined();
    });

    it('returns undefined for an empty string command name', () => {
      registerPlugin(makePlugin('leveling', ['rank']));

      expect(getPluginForCommand('')).toBeUndefined();
    });
  });
});
