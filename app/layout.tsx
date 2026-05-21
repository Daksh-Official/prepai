// app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "PrepAI",
  description: "AI-powered interview preparation tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-zinc-100`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextTopLoader color="var(--primary)" showSpinner={false} height={2} />
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 bg-muted/20">
              {children}
            </main>
            <Footer />
            <Toaster position="top-right" closeButton richColors />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}