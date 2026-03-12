'use client'

import React, { useEffect } from 'react'
import { useLayoutContext } from '@/context/useLayoutContext'
import { Offcanvas, OffcanvasBody, OffcanvasHeader } from 'react-bootstrap'
import { basePath } from '@/helpers'

const SettingsDrawer = () => {
  const {
    headerFixed,
    navFull,
    navFixed,
    navCollapsed,
    navMinified,
    darkNavigation,
    colorblindMode,
    highContrastMode,
    selectedTheme,
    toggleSetting,
    changeThemeStyle,
    reset,
    customizer,
  } = useLayoutContext()

  useEffect(() => {
    if (navCollapsed && !navFull) {
      toggleSetting('navFull', true)
    }
  }, [navCollapsed])

  const themes = [
    {
      id: 'default',
      name: 'Default',
      gradient: 'linear-gradient(135deg, #FF6A00, #F6A2D5, #4C91BF, #7A8B92, #AB7C9A)',
    },
    {
      id: 'nebula',
      name: 'Nebula',
      gradient: 'linear-gradient(135deg, #2a7dbf, #2a9d8f, #766cbc, #f4a261, #e76f51)',
    },
    {
      id: 'olive',
      name: 'Olive',
      gradient: 'linear-gradient(135deg, #556B2F, #6B8E23, #8B9A3D, #A9B83E, #BDB76B)',
    },
    {
      id: 'solar',
      name: 'Solar',
      gradient: 'linear-gradient(135deg, #FF8C00, #FFD700, #FF4500, #F1C40F, #F39C12)',
    },
    {
      id: 'lunar',
      name: 'Lunar',
      gradient: 'linear-gradient(135deg, #2C3E50, #34495E, #5F6368, #AAB7B8, #E6E6FA, #F1F3F4)',
    },
    {
      id: 'night',
      name: 'Night',
      gradient: 'linear-gradient(135deg, #1e2a47, #2b3654, #363d6c, #4f5d79, #717b91, #b6c4d1)',
    },
    {
      id: 'aurora',
      name: 'Aurora',
      gradient: 'linear-gradient(135deg, #337e7e, #527a4a, #63279b, #7FFF00, #87CEFA, #B0E0E6)',
    },
    {
      id: 'earth',
      name: 'Earth',
      gradient: 'linear-gradient(135deg, #2198f3, #3173a5, #3f6888, #618d48, #52bf11)',
    },
    {
      id: 'flare',
      name: 'Flare',
      gradient: 'linear-gradient(135deg, #FF4500, #FF6347, #F44336, #D32F2F, #B71C1C)',
    },
    {
      id: 'storm',
      name: 'Storm',
      gradient: 'linear-gradient(135deg, #2F4F4F, #3B5360, #4B6A6E, #5A7980, #A9A9A9, #FFD700)',
    },
  ]

  return (
    <Offcanvas
      show={customizer.isOpen}
      placement="end"
      onHide={customizer.toggle}
      className="js-drawer-settings"
    >
      <OffcanvasHeader className="app-drawer-header">
        <div className="h4 mb-0">App Builder</div>
        <button type="button" className="btn btn-system ms-auto" onClick={customizer.toggle}>
          <svg className="sa-icon sa-icon-2x">
            <use href={`${basePath}/icons/sprite.svg#x`}></use>
          </svg>
        </button>
      </OffcanvasHeader>

      <OffcanvasBody className="custom-scrollbar h-100">
        <div className="info-container">
          Customize your dashboard layout, navigation style, and theme to match your preferences.
        </div>

        <div className="d-flex justify-content-spaced w-100 app-fob-showcase-text" data-prefix="Preview">
          <div className="app-fob app-fob-lg app-fob-showcase">
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>

        <div className="mod-status primary-mod" data-prefix="Primary Settings">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="actionHeaderFixed"
              checked={headerFixed}
              onChange={(e) => toggleSetting('headerFixed', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="actionHeaderFixed">
              Header position fixed
            </label>
          </div>
          <div className="form-check d-none d-lg-block d-xl-block d-xxl-block">
            <input
              type="checkbox"
              className="form-check-input"
              id="actionNavFull"
              checked={navFull}
              onChange={(e) => toggleSetting('navFull', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="actionNavFull">
              Navigation full height
            </label>
          </div>
        </div>

        <div className="mod-status d-none d-lg-block d-xl-block d-xxl-block" data-prefix="Addon Settings">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="actionNavFixed"
              checked={navFixed}
              onChange={(e) => toggleSetting('navFixed', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="actionNavFixed">
              Navigation position fixed
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="actionNavCollapsed"
              checked={navCollapsed}
              onChange={(e) => toggleSetting('navCollapsed', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="actionNavCollapsed">
              Navigation collapsed
            </label>
          </div>
        </div>

        <div className="mod-status" data-prefix="Misc Settings">
          <div className="form-check d-none d-lg-block d-xl-block d-xxl-block">
            <input
              type="checkbox"
              className="form-check-input"
              id="actionNavMinified"
              checked={navMinified}
              disabled={navCollapsed}
              onChange={(e) => toggleSetting('navMinified', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="actionNavMinified">
              Navigation Minified
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="darkNavigation"
              checked={darkNavigation}
              onChange={(e) => toggleSetting('darkNavigation', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="darkNavigation">
              Dark Navigation
            </label>
          </div>
        </div>

        <div className="mod-status" data-prefix="Aria Settings">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="actionColorblindMode"
              checked={colorblindMode}
              onChange={(e) => toggleSetting('colorblindMode', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="actionColorblindMode">
              Colorblind Mode
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="actionHighContrastMode"
              checked={highContrastMode}
              onChange={(e) => toggleSetting('highContrastMode', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="actionHighContrastMode">
              High Contrast Mode
            </label>
          </div>
        </div>

        <div className="mod-status app-themes" data-prefix="Themes">
          <div className="clickable-boxes">
            {themes.map((theme, index) => (
              <React.Fragment key={theme.id}>
                <input
                  type="radio"
                  id={`option${index}`}
                  name="options"
                  checked={selectedTheme === theme.id}
                  onChange={() => changeThemeStyle(theme.id)}
                />
                <label
                  htmlFor={`option${index}`}
                  data-prefix={theme.name}
                  style={{ background: theme.gradient }}
                ></label>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="d-flex" style={{ gap: '10px' }}>
          <button
            type="button"
            onClick={reset}
            className="btn reset-button btn-outline-danger flex-grow-1"
          >
            &#x21bb; Factory Reset
          </button>
        </div>
      </OffcanvasBody>
    </Offcanvas>
  )
}

export default SettingsDrawer
