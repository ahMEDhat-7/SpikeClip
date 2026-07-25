"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border border-dashed">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Preview unavailable</p>
              <p className="text-xs text-muted-foreground/60">
                {this.state.error?.message || "Something went wrong"}
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
