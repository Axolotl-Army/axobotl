import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import AppWrapper from '@/components/AppWrapper'
import AuthSessionProvider from '@/components/AuthSessionProvider'
import { appTitle } from '@/helpers'

import 'node-waves/dist/waves.css'
import '@/assets/webfonts/smartadmin/scss/sa-icons.scss'
import '@/assets/sass/smartapp.scss'

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
      <head>
        <link id="app-theme" rel="stylesheet" />
      </head>
      <body className={publicSans.className}>
        <AuthSessionProvider>
          <AppWrapper>{children}</AppWrapper>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
