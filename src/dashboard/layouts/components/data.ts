import { MenuItemType } from '@/types/layout'

export const menuItems: MenuItemType[] = [
  { key: 'main', label: 'Main', isTitle: true },
  {
    key: 'overview',
    label: 'Overview',
    icon: '/icons/sprite.svg#home',
    url: '/dashboard',
  },
  {
    key: 'commands',
    label: 'Commands',
    icon: '/icons/sprite.svg#terminal',
    url: '/dashboard/commands',
  },
  {
    key: 'logs',
    label: 'Command Logs',
    icon: '/icons/sprite.svg#file-text',
    url: '/dashboard/logs',
  },
  { key: 'plugins', label: 'Plugins', isTitle: true },
  {
    key: 'plugin-overview',
    label: 'All Plugins',
    icon: '/icons/sprite.svg#grid',
    url: '/dashboard/plugins',
  },
  {
    key: 'plugin-leveling',
    label: 'Leveling',
    icon: '/icons/sprite.svg#award',
    url: '/dashboard/plugins/leveling',
  },
  { key: 'settings', label: 'Settings', isTitle: true },
  {
    key: 'general',
    label: 'General',
    icon: '/icons/sprite.svg#settings',
    url: '/dashboard/settings',
  },
]
