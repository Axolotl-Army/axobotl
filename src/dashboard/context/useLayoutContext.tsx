'use client'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { toggleAttribute } from '@/helpers/layout'
import { ChildrenType } from '@/types'
import {
  LayoutState,
  LayoutThemeType,
  LayoutType,
  LayoutOffcanvasStatesType,
  OffcanvasControlType,
} from '@/types/layout'
import { basePath } from '@/helpers'

const INIT_STATE: LayoutState = {
  theme: 'dark',
  headerFixed: false,
  navFull: false,
  navFixed: false,
  navCollapsed: false,
  navMinified: false,
  darkNavigation: true,
  colorblindMode: false,
  highContrastMode: false,
  selectedTheme: 'lunar',
}

const LayoutContext = createContext<LayoutType | undefined>(undefined)

export const useLayoutContext = () => {
  const context = useContext(LayoutContext)
  if (!context) throw new Error('useLayoutContext can only be used within LayoutProvider')
  return context
}

export const LayoutProvider = ({ children }: ChildrenType) => {
  const [settings, setSettings] = useLocalStorage<LayoutState>(
    '__AXOBOTL_DASHBOARD_CONFIG__',
    INIT_STATE,
  )
  const [offcanvasStates, setOffcanvasStates] = useState<LayoutOffcanvasStatesType>({
    showCustomizer: false,
  })

  const getClassNameForSetting = (setting: keyof LayoutState): string => {
    const map: Record<string, string> = {
      headerFixed: 'set-header-fixed',
      navFull: 'set-nav-full',
      navFixed: 'set-nav-fixed',
      navCollapsed: 'set-nav-collapsed',
      navMinified: 'set-nav-minified',
      darkNavigation: 'set-nav-dark',
      colorblindMode: 'set-colorblind-mode',
      highContrastMode: 'set-high-contrast-mode',
    }
    return map[setting] || ''
  }

  const toggleSetting = useCallback(
    (key: keyof LayoutState, value: boolean) => {
      const className = getClassNameForSetting(key)
      document.documentElement.classList.toggle(className, value)
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    [setSettings],
  )

  const changeTheme = useCallback(
    (theme: LayoutThemeType, persist = true) => {
      toggleAttribute('data-bs-theme', theme)
      if (persist) setSettings((prev) => ({ ...prev, theme }))
    },
    [setSettings],
  )

  const changeThemeStyle = useCallback(
    (themeId: string) => {
      const themeStyleEl = document.getElementById('app-theme') as HTMLLinkElement
      if (themeId === 'default') {
        if (themeStyleEl) themeStyleEl.href = ''
        setSettings((prev) => ({ ...prev, selectedTheme: themeId as LayoutState['selectedTheme'] }))
        return
      }
      if (themeStyleEl) themeStyleEl.href = themeId ? `${basePath}/css/${themeId}.css` : ''
      setSettings((prev) => ({ ...prev, selectedTheme: themeId as LayoutState['selectedTheme'] }))
    },
    [setSettings],
  )

  const reset = useCallback(() => {
    const htmlRoot = document.documentElement
    const themeStyleEl = document.getElementById('theme-style') as HTMLLinkElement
    const classesToRemove = [
      'set-header-fixed',
      'set-nav-full',
      'set-nav-fixed',
      'set-nav-collapsed',
      'set-nav-minified',
      'set-nav-dark',
      'set-colorblind-mode',
      'set-high-contrast-mode',
    ]
    classesToRemove.forEach((cls) => htmlRoot.classList.remove(cls))
    if (themeStyleEl) themeStyleEl.href = ''
    setSettings(INIT_STATE)
    localStorage.removeItem('panelStates')
  }, [setSettings])

  const showBackdrop = () => {
    const backdrop = document.createElement('div')
    backdrop.id = 'custom-backdrop'
    backdrop.className = 'offcanvas-backdrop sidenav-backdrop fade show'
    document.body.appendChild(backdrop)
    document.body.style.overflow = 'hidden'
    if (window.innerWidth > 767) document.body.style.paddingRight = '15px'
    backdrop.addEventListener('click', () => {
      document.documentElement.classList.remove('app-mobile-menu-open')
      hideBackdrop()
    })
  }

  const hideBackdrop = () => {
    const backdrop = document.getElementById('custom-backdrop')
    if (backdrop) {
      document.body.removeChild(backdrop)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }

  const toggleCustomizer: OffcanvasControlType['toggle'] = () => {
    setOffcanvasStates((prev) => ({ ...prev, showCustomizer: !prev.showCustomizer }))
  }

  const customizer = useMemo(
    () => ({
      isOpen: offcanvasStates.showCustomizer,
      toggle: toggleCustomizer,
    }),
    [offcanvasStates],
  )

  useEffect(() => {
    toggleAttribute('data-bs-theme', settings.theme)
    const themeStyleEl = document.getElementById('app-theme') as HTMLLinkElement | null
    if (themeStyleEl && settings.selectedTheme === 'default') {
      themeStyleEl.href = ''
    }
    if (themeStyleEl && settings.selectedTheme !== 'default') {
      themeStyleEl.href = settings.selectedTheme ? `${basePath}/css/${settings.selectedTheme}.css` : ''
    }
    Object.entries(settings).forEach(([key, val]) => {
      if (typeof val === 'boolean') {
        const className = getClassNameForSetting(key as keyof LayoutState)
        if (className) document.documentElement.classList.toggle(className, val)
      }
    })
  }, [settings])

  const contextValue = useMemo(
    () => ({
      ...settings,
      settings,
      changeTheme,
      changeThemeStyle,
      toggleSetting,
      reset,
      showBackdrop,
      hideBackdrop,
      customizer,
    }),
    [settings, changeTheme, changeThemeStyle, toggleSetting, reset, customizer],
  )

  return <LayoutContext.Provider value={contextValue}>{children}</LayoutContext.Provider>
}
