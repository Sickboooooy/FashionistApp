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
  title: "FashionistAPP | Premium AI Fashion",
  description: "Experience the future of fashion with our AI-powered outfit generator.",
};

import AuthWrapper from "@/components/layout/AuthWrapper";
import CartDrawer from "@/components/layout/CartDrawer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthWrapper>
          {children}
          <CartDrawer />
        </AuthWrapper>
      </body>
    </html>
  );
}
