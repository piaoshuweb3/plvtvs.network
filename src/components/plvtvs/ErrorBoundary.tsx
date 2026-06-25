'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PLVTVS ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      // Default fallback: show a minimal error message instead of null
      return (
        <div className="min-h-[200px] flex items-center justify-center text-center p-4">
          <div>
            <div className="cyber-mono text-xs text-[#FFCC00] tracking-[0.3em] mb-2 cyber-flicker">
              {'// SUBSYSTEM ERROR'}
            </div>
            <div className="cyber-mono text-[10px] text-[#666]">
              Module failed to load. Other sections still operational.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
