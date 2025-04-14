import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">SQL 脚本自动化执行工具</h1>
                <div className="text-sm bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
                  内部工具
                </div>
              </div>
            </div>
          </header>
          <main className="flex-grow container mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} QA DB SQL Monitor System
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}