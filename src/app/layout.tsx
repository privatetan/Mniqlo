import './globals.css'

// Initialize cron scheduler on server start
if (typeof window === 'undefined') {
  // Server-side only
  import('@/lib/cron').catch(err => {
    console.error('Failed to initialize cron:', err);
  });
}



export const metadata = {
  title: 'Mniqlo',
  description: 'Uniqlo App'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { LanguageProvider } from '@/context/LanguageContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <LanguageProvider>
          <main>
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  )
}
