import './globals.css'



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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
