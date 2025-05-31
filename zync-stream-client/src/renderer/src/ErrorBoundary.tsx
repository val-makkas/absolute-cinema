import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary caught an error:', error)
    console.error('🚨 Error Info:', errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
          <div className="max-w-2xl text-center">
            <h1 className="text-3xl font-bold mb-6 text-red-400">🚨 Application Error</h1>

            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-6 text-left">
              <h2 className="text-lg font-semibold mb-3 text-red-300">Error Details:</h2>
              <p className="text-red-200 font-mono text-sm mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>

              {this.state.error?.stack && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-red-300 hover:text-red-200">
                    Show Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs text-red-200/70 overflow-auto max-h-40 bg-black/30 p-3 rounded">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-4">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined, errorInfo: undefined })
                }}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium mr-4"
              >
                Try Again
              </button>

              <button
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
                className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-medium"
              >
                Reset & Reload
              </button>
            </div>

            <p className="text-white/60 text-sm mt-6">
              If this error persists, try clearing your browser data or contact support.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
