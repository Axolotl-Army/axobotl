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
]
