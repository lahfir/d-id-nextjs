'use client';

import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-blueprint" style={{ background: 'var(--bg-primary)' }}>
          <div className="panel-elevated max-w-md w-full p-10 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-xl mx-auto mb-6 flex items-center justify-center" style={{
              background: 'var(--danger-muted)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
            }}>
              <svg className="w-7 h-7" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl mb-3" style={{ color: 'var(--text-primary)' }}>
              Something went wrong
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-copper"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs p-3 rounded-lg overflow-auto" style={{
                  background: 'var(--danger-muted)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(248, 113, 113, 0.15)',
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}