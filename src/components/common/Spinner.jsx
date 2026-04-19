/**
 * Reusable spinner.
 *
 * Variants:
 *   - page: full-screen loading overlay (default for Suspense)
 *   - inline: small inline spinner
 *
 * Usage:
 *   <Spinner />                  ← full-page
 *   <Spinner variant="inline" /> ← small
 */
export default function Spinner({ variant = 'page', className = '' }) {
  if (variant === 'inline') {
    return (
      <span
        className={`inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
        aria-label='Loading'
      />
    )
  }

  return (
    <div
      className='min-h-screen bg-black flex items-center justify-center'
      aria-label='Loading page'
    >
      <div className='flex flex-col items-center gap-4'>
        <div className='w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin' />
        <p className='text-zinc-600 text-sm'>Loading…</p>
      </div>
    </div>
  )
}
