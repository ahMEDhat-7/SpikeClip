"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/studio")) return null;

  return (
    <footer className="border-t border-hairline bg-background">
      <div className="container mx-auto px-6 md:px-12 py-section">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-primary/10">
                <img src="/logo.svg" alt="SpikeClip" className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-primary">SpikeClip</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Find what viewers actually rewatch.
              <br />
              Data-driven clip extraction.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3" style={{ letterSpacing: "var(--tracking-wide, 0.06em)" }}>
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Studio
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3" style={{ letterSpacing: "var(--tracking-wide, 0.06em)" }}>
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground/50 cursor-not-allowed">
                  Blog
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground/50 cursor-not-allowed">
                  Changelog
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground/50 cursor-not-allowed">
                  Documentation
                </span>
              </li>
            </ul>
          </div>

          {/* Legal & Social */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3" style={{ letterSpacing: "var(--tracking-wide, 0.06em)" }}>
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3" style={{ letterSpacing: "var(--tracking-wide, 0.06em)" }}>
                Social
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Twitter / X
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SpikeClip. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
