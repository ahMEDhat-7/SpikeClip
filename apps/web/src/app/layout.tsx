import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ThemeProvider } from "@/presentation/providers/ThemeProvider";
import { Header } from "@/presentation/components/layout/Header";
import { Footer } from "@/presentation/components/layout/Footer";
import { CursorCircle } from "@/presentation/components/layout/CursorCircle";
import { Providers } from "@/application/providers/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://clutchapp.dev"
  ),
  title: {
    default: "Clutch — Find what viewers actually rewatch",
    template: "%s | Clutch",
  },
  description:
    "Extract the most-replayed moments from YouTube videos using real audience heatmap data. No AI guesses — just actual viewer behavior.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Clutch",
    title: "Clutch — Find what viewers actually rewatch",
    description:
      "Extract the most-replayed moments from YouTube videos using real audience heatmap data.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clutch — Find what viewers actually rewatch",
    description:
      "Extract the most-replayed moments from YouTube videos using real audience heatmap data.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "application/ld+json": JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Clutch",
        url: process.env.NEXT_PUBLIC_SITE_URL || "https://clutchapp.dev",
        logo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://clutchapp.dev"}/logo.svg`,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Clutch",
        url: process.env.NEXT_PUBLIC_SITE_URL || "https://clutchapp.dev",
        description:
          "Extract the most-replayed moments from YouTube videos using real audience heatmap data.",
      },
    ]),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=JSON.parse(localStorage.getItem('theme')||'{}');if(t.theme==='dark'||(!('theme' in t)&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
            >
              Skip to content
            </a>
            <div className="relative flex min-h-screen flex-col">
              <CursorCircle />
              <Header />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
            </div>
          </Providers>
          <Toaster
            richColors
            position="top-right"
            duration={5000}
            closeButton
            toastOptions={{ className: "max-w-md" }}
          />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
