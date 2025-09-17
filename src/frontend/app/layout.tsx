import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Providers from "./providers"
import { GeistSans } from "geist/font/sans"
import { DM_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import { Analytics } from "@vercel/analytics/react"
import { Sidebar } from "@/components/sidebar"

const mono = DM_Mono({
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: 'SageMind',
  description: 'SageMind - AI powered answer engine with intelligent search capabilities.',
  generator: 'sagemind-engine',
  icons: {
    icon: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={cn("antialiased h-full", GeistSans.className, mono.variable)}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <div className="flex h-full">
              <Sidebar />
              <main className="flex-1 relative">{children}</main>
            </div>
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
