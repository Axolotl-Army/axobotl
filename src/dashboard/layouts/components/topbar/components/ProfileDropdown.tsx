'use client'
import React from 'react'
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { signOut, useSession } from 'next-auth/react'
import { basePath } from '@/helpers'

const ProfileDropdown = () => {
  const { data: session } = useSession()
  const user = session?.user

  const avatarUrl = user?.image ?? `${basePath}/icons/user.svg`

  return (
    <Dropdown>
      <DropdownToggle
        as="a"
        type="button"
        className="btn-system bg-transparent d-flex flex-shrink-0 align-items-center justify-content-center no-arrow"
        aria-label="Open Profile Dropdown"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          className="profile-image profile-image-md rounded-circle"
          alt={user?.name ?? 'User'}
          width={32}
          height={32}
        />
      </DropdownToggle>

      <DropdownMenu className="dropdown-menu-animated dropdown-menu-end">
        <div className="notification-header rounded-top mb-2">
          <div className="d-flex flex-row align-items-center mt-1 mb-1 color-white">
            <span className="status status-success d-inline-block me-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                className="profile-image rounded-circle"
                alt={user?.name ?? 'User'}
                width={40}
                height={40}
              />
            </span>
            <div className="info-card-text">
              <div className="fs-lg text-truncate text-truncate-lg">{user?.name ?? 'User'}</div>
              <span className="text-truncate text-truncate-md opacity-80 fs-sm">Discord</span>
            </div>
          </div>
        </div>
        <DropdownDivider className="m-0" />
        <DropdownItem href="/dashboard">
          <span>Dashboard</span>
        </DropdownItem>
        <DropdownDivider className="m-0" />
        <DropdownItem
          className="py-3 fw-500 d-flex justify-content-between"
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
        >
          <span className="text-danger">Logout</span>
          <span className="d-block text-truncate text-truncate-sm">@{user?.name}</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export default ProfileDropdown
