'use client'
import { useLayoutContext } from '@/context/useLayoutContext'
import { useEffect, useState } from 'react'
import { basePath } from '@/helpers'

const ToggleMobileMenu = () => {
  const { showBackdrop } = useLayoutContext()
  const [html, setHtml] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHtml(document.documentElement)
  }, [])

  const toggleSidebar = () => {
    if (!html) return
    html.classList.toggle('app-mobile-menu-open')
    showBackdrop()
  }

  return (
    <div
      className="mobile-menu-icon me-2 d-flex d-sm-flex d-md-flex d-lg-none flex-shrink-0"
      onClick={toggleSidebar}
    >
      <svg className="sa-icon">
        <use href={`${basePath}/icons/sprite.svg#menu`}></use>
      </svg>
    </div>
  )
}

export default ToggleMobileMenu
