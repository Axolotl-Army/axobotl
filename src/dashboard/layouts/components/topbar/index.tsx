import AppLogo from '@/components/AppLogo'
import ProfileDropdown from '@/layouts/components/topbar/components/ProfileDropdown'
import GuildSelector from '@/layouts/components/topbar/components/GuildSelector'
import { useLayoutContext } from '@/context/useLayoutContext'
import ToggleMobileMenu from '@/layouts/components/topbar/components/ToggleMobileMenu'
import ToggleSidenav from '@/layouts/components/topbar/components/ToggleSidenav'
import dynamic from 'next/dynamic'
import { basePath } from '@/helpers'

const ThemeToggler = dynamic(
  () => import('@/layouts/components/topbar/components/ThemeToggler'),
  { ssr: false },
)

const Topbar = () => {
  const { customizer } = useLayoutContext()
  return (
    <header className="app-header">
      <div className="d-flex flex-grow-1 w-100 me-auto align-items-center">
        <AppLogo />
        <ToggleMobileMenu />
        <ToggleSidenav />
        <form className="app-search" role="search" autoComplete="off">
          <input type="text" className="form-control" placeholder="Search for anything" />
        </form>
      </div>

      <GuildSelector />

      <button
        type="button"
        className="btn btn-system hidden-mobile"
        onClick={customizer.toggle}
        aria-label="Open Settings"
      >
        <svg className="sa-icon sa-icon-2x">
          <use href={`${basePath}/icons/sprite.svg#settings`}></use>
        </svg>
      </button>

      <ThemeToggler />

      <ProfileDropdown />
    </header>
  )
}

export default Topbar
