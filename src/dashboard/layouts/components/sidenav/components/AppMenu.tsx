'use client'
import { scrollToElement } from '@/helpers/layout'
import { MenuItemType } from '@/types/layout'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Collapse } from 'react-bootstrap'
import { basePath } from '@/helpers'

const MenuItemWithChildren = ({
  item,
  openMenuKey,
  setOpenMenuKey,
  level = 0,
  openKeys,
}: {
  item: MenuItemType
  openMenuKey: string | null
  setOpenMenuKey: (key: string | null) => void
  level?: number
  openKeys?: Set<string>
}) => {
  const pathname = usePathname()
  const isTopLevel = level === 0

  const [localOpen, setLocalOpen] = useState(false)
  const [didAutoOpen, setDidAutoOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)

  const isChildActive = (children: MenuItemType[]): boolean =>
    children.some(
      (child) =>
        (child.url && pathname.endsWith(child.url)) ||
        (child.children && isChildActive(child.children)),
    )

  const isActive = isChildActive(item.children || [])

  const isOpen =
    manualOpen !== null
      ? manualOpen
      : openKeys?.has(item.key)
        ? true
        : isTopLevel
          ? openMenuKey === item.key
          : localOpen

  useEffect(() => {
    if (isTopLevel && isActive && !didAutoOpen) {
      setOpenMenuKey(item.key)
      setDidAutoOpen(true)
    }
    if (!isTopLevel && isActive && !didAutoOpen) {
      setLocalOpen(true)
      setDidAutoOpen(true)
    }
  }, [isActive, isTopLevel, item.key, setOpenMenuKey, didAutoOpen])

  const toggleOpen = () => {
    setManualOpen((prev) => !(prev ?? isOpen))
    if (isTopLevel) {
      setOpenMenuKey(manualOpen ? null : item.key)
    } else {
      setLocalOpen(!isOpen)
    }
  }

  return (
    <li className={`nav-item has-ul ${!isOpen && isActive ? 'active' : ''}`}>
      <a onClick={toggleOpen} aria-expanded={isOpen}>
        {item.icon && (
          <svg className="sa-icon">
            <use href={basePath + item.icon}></use>
          </svg>
        )}
        <span className="nav-link-text">{item.label}</span>
        <div className="ms-auto">
          {item.badge && (
            <span className={`badge me-4 bg-${item.badge.variant}-700`}>{item.badge.text}</span>
          )}
          <span className="collapse-sign">
            <i className="sa sa-chevron-up"></i>
          </span>
        </div>
      </a>
      <Collapse in={isOpen}>
        <div>
          <ul className="d-flex">
            {(item.children || []).map((child) =>
              child.children ? (
                <MenuItemWithChildren
                  key={child.key}
                  item={child}
                  openMenuKey={openMenuKey}
                  setOpenMenuKey={setOpenMenuKey}
                  level={level + 1}
                />
              ) : (
                <MenuItem key={child.key} item={child} />
              ),
            )}
          </ul>
        </div>
      </Collapse>
    </li>
  )
}

const MenuItem = ({ item }: { item: MenuItemType }) => {
  const pathname = usePathname()
  const isActive = item.url && pathname.endsWith(item.url)

  return (
    <li className={`${isActive ? 'active' : ''}`}>
      <Link target={item.target} href={item.url ?? '/'} className={`${isActive ? 'active' : ''}`}>
        {item.icon && (
          <svg className="sa-icon">
            <use href={basePath + item.icon}></use>
          </svg>
        )}
        <span className="nav-link-text">{item.label}</span>
        {item.badge && (
          <span className={`badge badge-end ms-auto bg-${item.badge.variant}`}>
            {item.badge.text}
          </span>
        )}
      </Link>
    </li>
  )
}

const AppMenu = ({
  menuItems,
  openKeys,
}: {
  menuItems: MenuItemType[]
  openKeys?: Set<string>
}) => {
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null)

  const scrollToActiveLink = () => {
    const activeItem: HTMLAnchorElement | null = document.querySelector('li.active')
    if (activeItem) {
      const simpleBarContent = document.querySelector('#sidenav .simplebar-content-wrapper')
      if (simpleBarContent) {
        const offset = activeItem.offsetTop - window.innerHeight * 0.4
        scrollToElement(simpleBarContent, offset, 500)
      }
    }
  }

  useEffect(() => {
    setTimeout(() => scrollToActiveLink(), 100)
  }, [])

  return (
    <ul className="nav-menu">
      {menuItems.map((item) =>
        item.isTitle ? (
          <li className="nav-title" key={item.key}>
            <span>{item.label}</span>
          </li>
        ) : item.children ? (
          <MenuItemWithChildren
            key={item.key}
            item={item}
            openMenuKey={openMenuKey}
            setOpenMenuKey={setOpenMenuKey}
            openKeys={openKeys}
          />
        ) : (
          <MenuItem key={item.key} item={item} />
        ),
      )}
    </ul>
  )
}

export default AppMenu
