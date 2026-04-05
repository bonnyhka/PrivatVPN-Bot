import type { Metadata, Viewport } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'PrivatVPN — Admin',
  description: 'PrivatVPN admin panel',
}

export const viewport: Viewport = {
  themeColor: '#132430',
  width: 'device-width',
  initialScale: 1,
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}

