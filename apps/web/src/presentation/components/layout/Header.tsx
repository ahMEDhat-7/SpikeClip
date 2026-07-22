"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  User,
  LayoutDashboard,
  Film,
} from "lucide-react";
import { useAuth } from "@/application/hooks/use-auth";

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function UserAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold ${className}`}
    >
      {initials}
    </div>
  );
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  if (pathname.startsWith("/studio")) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto grid grid-cols-3 h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl justify-self-start">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <img src="/logo.svg" alt="" className="h-5 w-5" />
          </div>
          <span>
            <span className="text-primary">Spike</span>
            <span className="text-muted-foreground">Clip</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center justify-center gap-6" aria-label="Main navigation">
          <NavLink href="/features" active={isActive("/features")}>Features</NavLink>
          <NavLink href="/pricing" active={isActive("/pricing")}>Pricing</NavLink>
          <NavLink href="/about" active={isActive("/about")}>About</NavLink>
        </nav>

        <div className="flex items-center justify-end gap-2">
          {!isLoading && user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="User menu"
                className="flex items-center gap-2 rounded-full transition-all hover:ring-2 hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <UserAvatar name={user.name || user.email} className="h-9 w-9 text-sm" />
              </button>

              {dropdownOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-background shadow-lg p-1.5 space-y-0.5">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <Badge variant="secondary" className="text-[10px] font-mono mt-1.5">
                      {user.plan === "free"
                        ? `${user.analysesUsed}/${user.analysesLimit} analyses`
                        : user.plan}
                    </Badge>
                  </div>

                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    Dashboard
                  </Link>
                  <Link
                    href="/studio"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <Film className="h-4 w-4 text-muted-foreground" />
                    Studio
                  </Link>
                  {user.plan === "free" && (
                    <Link
                      href="/pricing"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-primary font-medium"
                    >
                      Upgrade Plan
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile
                  </Link>

                  <div className="h-px bg-border my-1" />

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {!isLoading && !user && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">Sign Up</Link>
              </Button>
            </>
          )}

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t bg-background px-4 py-4 space-y-3" aria-label="Mobile navigation">
          <Link
            href="/features"
            className="block text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="block text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="block text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            About
          </Link>

          {!isLoading && user && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-3 pb-2">
                <UserAvatar name={user.name || user.email} className="h-10 w-10 text-sm" />
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/studio"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                <Film className="h-4 w-4" />
                Studio
              </Link>
              {user.plan === "free" && (
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 text-sm font-medium text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  Upgrade Plan
                </Link>
              )}
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="secondary" className="text-xs font-mono">
                  {user.plan === "free"
                    ? `${user.analysesUsed}/${user.analysesLimit} analyses`
                    : user.plan}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}

          {!isLoading && !user && (
            <div className="space-y-2 pt-2 border-t">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="w-full">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign Up
                </Link>
              </Button>
            </div>
          )}

          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
                setMobileOpen(false);
              }}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 mr-2" />
              ) : (
                <Moon className="h-4 w-4 mr-2" />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
          )}
        </nav>
      )}
    </header>
  );
}
