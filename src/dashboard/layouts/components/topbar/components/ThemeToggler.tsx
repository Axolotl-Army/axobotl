'use client'
import { useLayoutContext } from '@/context/useLayoutContext'
import { basePath } from '@/helpers'

const ThemeToggler = () => {
  const { theme, changeTheme } = useLayoutContext()

  const toggleTheme = () => {
    changeTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button type="button" className="btn btn-system" onClick={toggleTheme}>
      {theme === 'dark' ? (
        <svg className="sa-icon sa-icon-2x sa-mode-light" suppressHydrationWarning>
          <use href={`${basePath}/icons/sprite.svg#sun`}></use>
        </svg>
      ) : (
        <svg className="sa-icon sa-icon-2x sa-mode-dark" suppressHydrationWarning>
          <use href={`${basePath}/icons/sprite.svg#moon`}></use>
        </svg>
      )}
    </button>
  )
}

export default ThemeToggler
