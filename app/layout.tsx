import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Moka — Smart Farm Companion',
  description:
    'Track your herd, record milk production, and manage your farm finances — all in one place. Built for dairy farmers across Africa.',
  openGraph: {
    title: 'Moka — Smart Farm Companion',
    description: 'The all-in-one farm management app for dairy farmers.',
    siteName: 'Moka by Africorex',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
