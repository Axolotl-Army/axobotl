import { Variant } from 'react-bootstrap/types'

export type LayoutThemeType = 'light' | 'dark'

export type LayoutState = {
  theme: LayoutThemeType
  headerFixed: boolean
  navFull: boolean
  navFixed: boolean
  navCollapsed: boolean
  navMinified: boolean
  darkNavigation: boolean
  colorblindMode: boolean
  highContrastMode: boolean
}

export type LayoutOffcanvasStatesType = {
  showCustomizer: boolean
}

export type OffcanvasControlType = {
  isOpen: boolean
  toggle: () => void
}

export interface LayoutType extends LayoutState {
  changeTheme: (theme: LayoutThemeType, persist?: boolean) => void
  customizer: OffcanvasControlType
  reset: () => void
  toggleSetting: (key: keyof LayoutState, value: boolean) => void
  showBackdrop: () => void
  hideBackdrop: () => void
}

export type MenuItemType = {
  key: string
  label: string
  isTitle?: boolean
  icon?: string
  url?: string
  badge?: {
    variant: Variant
    text: string
  }
  parentKey?: string
  target?: string
  children?: MenuItemType[]
}
