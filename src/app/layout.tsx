import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  weight: ['300', '400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'Fluent — Learn Languages',
  description: 'Master new languages with Fluent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lexend.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
