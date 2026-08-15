"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useCallback } from "react";
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
      aria-current={active ? "page" : undefined}
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
  const mobileNavRef = useRef<HTMLElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close dropdown on click outside
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

  // Close mobile menu on Escape + focus trap
  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        mobileMenuBtnRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && mobileNavRef.current) {
        const focusable = mobileNavRef.current.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // Focus first link when menu opens
    const timer = setTimeout(() => {
      const firstLink = mobileNavRef.current?.querySelector<HTMLElement>("a, button");
      firstLink?.focus();
    }, 50);

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [mobileOpen]);

  // Desktop dropdown arrow-key navigation
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!dropdownMenuRef.current) return;
    const items = dropdownMenuRef.current.querySelectorAll<HTMLElement>(
      'a, button:not([disabled])'
    );
    const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prev]?.focus();
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (pathname.startsWith("/studio")) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background">
      <div className="container mx-auto grid grid-cols-3 h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl justify-self-start">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <img src="/logo.svg" alt="SpikeClip" className="h-5 w-5" />
          </div>
          <span>
            <span className="text-red-400">Spike</span>
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
                <div
                  ref={dropdownMenuRef}
                  role="menu"
                  onKeyDown={handleDropdownKeyDown}
                  className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-background shadow-lg p-1.5 space-y-0.5"
                >
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
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    Dashboard
                  </Link>
                  <Link
                    href="/studio"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <Film className="h-4 w-4 text-muted-foreground" />
                    Studio
                  </Link>
                  {user.plan === "free" && (
                    <Link
                      href="/pricing"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-primary font-medium"
                    >
                      Upgrade Plan
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile
                  </Link>

                  <div className="h-px bg-border my-1" />

                  <button
                    role="menuitem"
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

          {!user && (
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
            ref={mobileMenuBtnRef}
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

      {/* Mobile navigation — animated with CSS transitions */}
      <nav
        ref={mobileNavRef}
        className={`md:hidden border-t bg-background overflow-hidden transition-all duration-200 ease-out ${
          mobileOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none border-t-0"
        }`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen || undefined}
      >
        <div className="px-4 py-4 space-y-1">
          <Link
            href="/features"
            className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive("/features") ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            onClick={() => setMobileOpen(false)}
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive("/pricing") ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive("/about") ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            onClick={() => setMobileOpen(false)}
          >
            About
          </Link>

          {!isLoading && user && (
            <div className="space-y-1 pt-2 border-t mt-2">
              <div className="flex items-center gap-3 px-3 py-2">
                <UserAvatar name={user.name || user.email} className="h-10 w-10 text-sm" />
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/studio"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <Film className="h-4 w-4" />
                Studio
              </Link>
              {user.plan === "free" && (
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Upgrade Plan
                </Link>
              )}
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <div className="flex items-center gap-2 px-3 py-1">
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

          {!user && (
            <div className="space-y-1 pt-2 border-t mt-2">
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
              className="w-full justify-start"
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
        </div>
      </nav>
    </header>
  );
}
