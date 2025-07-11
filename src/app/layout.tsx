
import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/core/theme-provider";
import { AuthProvider } from '@/context/AuthContext';
import { DialogProvider } from '@/context/DialogContext';
import EnvWarningBanner from '@/components/core/EnvWarningBanner';

export const metadata: Metadata = {
  title: 'Mäti - Save and Organize Your Thoughts',
  description: 'Your personal space to save, tag, and rediscover web links, notes, and ideas effortlessly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <EnvWarningBanner />
        <AuthProvider>
          <DialogProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </DialogProvider>
        </AuthProvider>
        {/* Scripts for oEmbed providers like Twitter and Instagram */}
        <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" charset="utf-8" />
        <Script src="https://www.instagram.com/embed.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
