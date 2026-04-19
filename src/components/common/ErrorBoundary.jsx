import React from 'react'

/**
 * Catches render errors anywhere in the child component tree.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * Custom fallback:
 *   <ErrorBoundary fallback={(error, reset) => <MyError error={error} onReset={reset} />}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }

      return (
        <div className='flex flex-col items-center justify-center min-h-[200px] p-8 text-center'>
          <p className='text-red-400 font-semibold mb-2'>Something went wrong.</p>
          <p className='text-zinc-500 text-sm mb-4'>{this.state.error?.message}</p>
          <button
            onClick={this.reset}
            className='text-sm text-violet-400 hover:text-violet-300 hover:underline transition-colors'
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
