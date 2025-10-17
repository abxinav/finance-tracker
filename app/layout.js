import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  title: 'SpendWise - AI Expense Manager',
  description: 'Track expenses in seconds with AI-powered natural language parsing',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}