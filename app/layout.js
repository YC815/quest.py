"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Note: Metadata export removed as it's not allowed in a 'use client' component

export default function RootLayout({ children }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <title>Quest.py | Learn Python</title>
        <meta
          name="description"
          content="Quest.py 是一個互動式的 Python 練習平台，讓你通過挑戰題目和即時反饋提升 Python 技能。"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </NextThemesProvider>
      </body>
    </html>
  );
}
