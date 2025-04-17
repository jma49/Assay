import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SQL 脚本自动化执行工具",
  description: "内部SQL数据质量监控系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="min-h-screen flex flex-col">
            <header className="bg-card text-card-foreground border-b border-border py-4">
              <div className="container mx-auto px-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-xl font-bold">SQL 脚本自动化执行工具</h1>
                  <div className="flex items-center gap-4">
                    <div className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                      内部工具
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-grow container mx-auto px-4 py-6">
              {children}
            </main>
            <footer className="bg-card text-card-foreground border-t border-border py-4">
              <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Designed By Jincheng
              </div>
            </footer>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}