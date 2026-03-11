'use client'
import { ChildrenType } from '@/types'
import { ToastContainer } from 'react-toastify'
import { LayoutProvider } from '@/context/useLayoutContext'
import dynamic from 'next/dynamic'

const WavesInitializer = dynamic(() => import('./client-wrappers/WaveClient'), { ssr: false })

const AppWrapper = ({ children }: ChildrenType) => {
  return (
    <LayoutProvider>
      <WavesInitializer />
      {children}
      <ToastContainer theme="colored" />
    </LayoutProvider>
  )
}

export default AppWrapper
