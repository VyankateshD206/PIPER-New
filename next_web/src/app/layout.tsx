import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/components/Navbar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PIPER",
  description: "Mood-based playlist generator (invite-only Spotify access)",
  icons: {
    icon: "/PIPER-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} piper-animated-bg antialiased`}
      >
        <div className="min-h-screen w-full overflow-x-hidden">
          <Navbar />
          <div className="mx-auto flex min-h-screen w-full max-w-6xl justify-center px-3 pb-4 pt-20 sm:px-6 sm:pb-6 sm:pt-24">
            <div className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_24px_80px_rgba(0,0,0,0.55)]">
              <div className="min-h-screen w-full min-w-0">
                {children}
              </div>
            </div>
          </div>
        </div>
        <Toaster
          position="top-right"
          offset="24px"
          toastOptions={{
            style: {
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(16, 185, 129, 0.08) 100%)',
              color: '#fff',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              backdropFilter: 'blur(16px)',
              padding: '16px',
              boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.1), 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.15)',
            },
            className: 'font-sans',
            unstyled: false,
          }}
          richColors
        />
      </body>
    </html>
  );
}
