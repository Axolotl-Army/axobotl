import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import AppWrapper from '@/components/AppWrapper'
import AuthSessionProvider from '@/components/AuthSessionProvider'
import { appTitle } from '@/helpers'

import 'node-waves/dist/waves.css'
import '@/public/css/sa-icons.css'
import '@/public/css/smartapp.css'
import '@/public/css/lunar.css'

export const metadata: Metadata = {
  title: {
    default: appTitle,
    template: '%s | ' + appTitle,
  },
  description: 'Axobotl Discord Bot Dashboard',
}

const publicSans = Public_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head></head>
      <body className={publicSans.className}>
        <AuthSessionProvider>
          <AppWrapper>{children}</AppWrapper>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
