import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {ClerkProvider} from "@clerk/nextjs"
import Providers from "@/providers/providers";
import {ui} from "@clerk/ui"
import { ThemeToaster } from "@/components/theme-toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Vision — AI creative workspace",
    template: "%s · Vision",
  },
  description:
    "Generate images, chat with an AI assistant, and compose music tracks in one private workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body >
    <ClerkProvider ui={ui}   >

        <Providers>
          {children}
          <ThemeToaster />
        </Providers>
    </ClerkProvider>

        </body>
    </html>
  );
}
