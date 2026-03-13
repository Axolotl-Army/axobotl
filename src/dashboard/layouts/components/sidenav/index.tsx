'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import AppLogo from '@/components/AppLogo'
import AppMenu from '@/layouts/components/sidenav/components/AppMenu'
import { menuItems } from '@/layouts/components/data'
import SimplebarClient from '@/components/client-wrappers/SimplebarClient'
import { basePath } from '@/helpers'
import { MenuItemType } from '@/types/layout'

const Sidenav = () => {
  const inputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const { filtered, openKeys } = useMemo<{ filtered: MenuItemType[]; openKeys: Set<string> }>(() => {
    if (!search.trim()) return { filtered: menuItems, openKeys: new Set<string>() }
    const keyword = search.toLowerCase()
    return filterMenu(menuItems, keyword)
  }, [search])

  function filterMenu(
    items: MenuItemType[],
    keyword: string,
  ): { filtered: MenuItemType[]; openKeys: Set<string> } {
    const openKeys: Set<string> = new Set()

    const filterItems = (arr: MenuItemType[]): MenuItemType[] =>
      arr
        .map((item) => {
          const labelMatches = item.label.toLowerCase().includes(keyword)
          let children: MenuItemType[] | undefined

          if (item.children) {
            children = filterItems(item.children)
          }
          const hasMatchingChild = children && children.length > 0
          if (labelMatches) {
            openKeys.add(item.key)
            return { ...item, children: item.children }
          }
          if (hasMatchingChild) {
            openKeys.add(item.key)
            return { ...item, children }
          }
          return null
        })
        .filter(Boolean) as MenuItemType[]

    return { filtered: filterItems(items), openKeys }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setSearch('')
      }
    }
    window.addEventListener('keydown', handleKeyDown, { passive: true })
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const hasResults = filtered.length > 0

  return (
    <aside className="app-sidebar d-flex flex-column">
      <AppLogo />

      <form className="app-menu-filter-container px-4" onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          className="form-control"
          id="searchInput"
          placeholder="Filter"
          autoComplete="off"
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <div
            className="js-filter-message nav-filter-msg badge bg-secondary btn"
            title="Clear filter"
            onClick={() => setSearch('')}
          >
            {filtered.length}
          </div>
        )}
      </form>

      <SimplebarClient id="js-primary-nav" className="mb-auto primary-nav flex-grow-1 h-100">
        {hasResults ? (
          <div id="sidenav" className="scrollbar">
            <AppMenu menuItems={filtered} openKeys={search ? openKeys : undefined} />
          </div>
        ) : (
          <div className="no-results-msg pt-3 info-container">
            <h6 className="mb-1">No menu items found.</h6>
            <p className="fs-sm">Try searching with different keywords.</p>
          </div>
        )}
      </SimplebarClient>

      <div className="nav-footer">
        <svg className="sa-icon sa-thin">
          <use href={`${basePath}/icons/sprite.svg#wifi`}></use>
        </svg>
      </div>
    </aside>
  )
}

export default Sidenav
