import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-body"
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://perplexity-team.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Perplexity Team | Shared Pro Search for Startup Teams",
    template: "%s | Perplexity Team"
  },
  description:
    "Pool one Perplexity Pro backend across your startup team, enforce seat-based monthly limits, and share Slack-friendly answers without paying for five individual AI subscriptions.",
  openGraph: {
    title: "Perplexity Team — Shared Pro Search for Startup Teams",
    description:
      "Replace scattered AI subscriptions with one pooled search layer, tracked per seat, with monthly limits and Slack-ready output.",
    type: "website",
    url: siteUrl,
    siteName: "Perplexity Team"
  },
  twitter: {
    card: "summary_large_image",
    title: "Perplexity Team — Pooled Pro Search",
    description: "Run one Pro search account for the whole team with usage controls and clear cost savings."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <html lang="en" className="dark">
      <body className={`${headingFont.variable} ${bodyFont.variable} min-h-screen bg-[#0d1117] font-[var(--font-body)] antialiased`}>
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        <header className="border-b border-[#30363d]/80 bg-[#0d1117]/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="font-[var(--font-heading)] text-lg font-semibold tracking-tight text-[#e6edf3]">
              Perplexity Team
            </Link>
            <nav className="flex items-center gap-4 text-sm text-[#9ba7b4]">
              <Link href="/search" className="transition hover:text-[#e6edf3]">
                Search
              </Link>
              <Link href="/dashboard" className="transition hover:text-[#e6edf3]">
                Dashboard
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
