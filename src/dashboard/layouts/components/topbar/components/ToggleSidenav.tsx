import React from 'react'
import { useLayoutContext } from '@/context/useLayoutContext'

const ToggleSidenav = () => {
  const { navMinified, toggleSetting } = useLayoutContext()

  const handleToggle = () => {
    toggleSetting('navMinified', !navMinified)
  }

  return (
    <button
      type="button"
      className="collapse-icon me-3 d-none d-lg-inline-flex d-xl-inline-flex d-xxl-inline-flex"
      onClick={handleToggle}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 8">
        <polygon fill="#878787" points="4.5,1 3.8,0.2 0,4 3.8,7.8 4.5,7 1.5,4" />
      </svg>
    </button>
  )
}

export default ToggleSidenav
