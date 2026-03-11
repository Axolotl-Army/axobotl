'use client'
import { SessionProvider } from 'next-auth/react'
import { ChildrenType } from '@/types'

const AuthSessionProvider = ({ children }: ChildrenType) => {
  return <SessionProvider>{children}</SessionProvider>
}

export default AuthSessionProvider
