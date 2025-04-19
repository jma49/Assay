import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper'; // Import the new wrapper
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Keep metadata export here (Server Component)
export const metadata: Metadata = {
  title: "SQL Script Automation Tool", // Default title
  description: "Internal system for monitoring SQL data quality.", // Default description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Combine font variables into a single string
  const fontClassName = `${geistSans.variable} ${geistMono.variable}`;

  return (
    // lang attribute will be set dynamically in ClientLayoutWrapper via useEffect
    <html suppressHydrationWarning>
      {/* Pass font class name and children to the client wrapper */}
      {/* The <body> tag is now rendered inside ClientLayoutWrapper */}
      <ClientLayoutWrapper fontClassName={fontClassName}>
        {children}
      </ClientLayoutWrapper>
    </html>
  );
}