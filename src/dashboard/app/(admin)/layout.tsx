'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Footer from '@/layouts/components/Footer'
import SettingsDrawer from '@/layouts/components/SettingsDrawer'
import Sidenav from '@/layouts/components/sidenav'
import Topbar from '@/layouts/components/topbar'
import Loader from '@/components/Loader'

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useSession()
  const router = useRouter()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (!hasMounted || status === 'loading') return <Loader height="100vh" />
  if (status === 'unauthenticated') return <Loader height="100vh" />

  return (
    <div className="app-wrap">
      <Topbar />
      <Sidenav />
      <main className="app-body">
        <div className="app-content">{children}</div>
        <Footer />
      </main>
      <SettingsDrawer />
    </div>
  )
}

export default AdminLayout
