"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/studio")) return null;

  return (
    <footer className="border-t border-hairline bg-background">
      <div className="container mx-auto px-6 md:px-12 py-section">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <img src="/logo.svg" alt="SpikeClip" className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">
              <span className="text-red-400">Spike</span>
              <span className="text-muted-foreground">Clip</span>
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground" aria-label="Footer navigation">
            <Link href="/features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <span className="text-border">|</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SpikeClip. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
