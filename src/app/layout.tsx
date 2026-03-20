import './globals.css'
import '@/lib/cron'

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
import { ThemeProvider } from '@/context/ThemeContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="mist">
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <main>
              {children}
            </main>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
