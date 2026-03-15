'use client'

import { useEffect } from 'react'
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
    toggleSetting,
    reset,
    customizer,
  } = useLayoutContext()

  useEffect(() => {
    if (navCollapsed && !navFull) {
      toggleSetting('navFull', true)
    }
  }, [navCollapsed])

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
